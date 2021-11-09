use std::mem;
use std::sync::Arc;

use axum::extract::ws::{Message, WebSocket};
use futures::{stream::SplitSink, SinkExt, StreamExt};
use json_patch::{diff, PatchOperation};
use serde::Serialize;
use serde_json::Error;
use tokio::sync::Mutex;
use tracing::*;

use crate::todo::{Todo, TodoAction};

pub struct WsState {
    // Our main state, behind a tokio Mutex
    todo: Mutex<Todo>,
    // A list of sessions we will send changes to
    txs: Mutex<Vec<SplitSink<WebSocket, Message>>>,
}

impl WsState {
    pub fn new() -> Self {
        WsState {
            todo: Mutex::new(Todo::default()),
            txs: Mutex::new(Vec::default()),
        }
    }

    async fn add_session(&self, mut tx: SplitSink<WebSocket, Message>) {
        let mut txs = self.txs.lock().await;

        if let Err(err) = tx
            .send(Message::Text(
                // This method will not fail in "normal" operations so an `expect()` is OK here
                serde_json::to_string(&ServerMessage::Full {
                    todo: &*self.todo.lock().await,
                })
                .expect("Serialize Error"),
            ))
            .await
        {
            warn!("Could not send initial state update: {}", err);
            return;
        }

        // Add session to our list of sessions
        txs.push(tx);
    }

    async fn apply(&self, action: TodoAction) -> Result<(), Error> {
        // Grab a mutable reference
        let mut state = self.todo.lock().await;

        // Serialize out the existing JSON for diffing later on
        let existing_json = serde_json::to_value(&*state)?;

        // Apply the action to our todo list.  This mutates it in place
        state.apply(action);

        // Serialize out the new JSON for diffing
        let new_json = serde_json::to_value(&*state)?;

        // Get the changes using the `diff` method from `json_patch`
        let ops = diff(&existing_json, &new_json).0;

        debug!("New Patches:{:?}", ops);

        // If there are no changes, don't bother broadcasting
        if !ops.is_empty() {
            let message = serde_json::to_string(&ServerMessage::Patch { ops })?;

            let mut txs = self.txs.lock().await;

            // We take all the txs to iterate, and replace with an empty `Vec`
            for mut tx in mem::take(&mut *txs) {
                // If there is an issue sending a message we will warn about it
                if let Err(err) = tx.send(Message::Text(message.clone())).await {
                    warn!("Client disconnected: {}", err);
                // If there is no issue sending, then we add it back to our `Vec`
                } else {
                    txs.push(tx)
                }
            }
        }

        Ok(())
    }
}

#[derive(Serialize, Debug)]
#[serde(tag = "type")]
enum ServerMessage<'a> {
    Patch { ops: Vec<PatchOperation> },
    Full { todo: &'a Todo },
}

pub async fn handle_socket(socket: WebSocket, state: Arc<WsState>) {
    let (tx, mut rx) = socket.split();

    // Add tx to our list of sessions for broadcasting later
    state.add_session(tx).await;

    // Loop until there are no messages or an error
    while let Some(Ok(msg)) = rx.next().await {
        if let Message::Text(text) = msg {
            // Decode our message and warn if it's something we don't know about
            if let Ok(action) = serde_json::from_str::<TodoAction>(&text) {
                // Apply the state, which will broadcast out changes as a JSON patch
                if let Err(err) = state.apply(action).await {
                    warn!("Error applying state:{}", err);
                }
            } else {
                warn!("Unknown action received:{}", text);
            }
        }
    }
}
