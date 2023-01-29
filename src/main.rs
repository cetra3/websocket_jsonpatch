use std::{net::SocketAddr, sync::Arc};

use axum::{
    extract::{ws::WebSocketUpgrade, Extension},
    response::IntoResponse,
    routing::get,
    Router,
};
use tracing::*;

mod todo;
mod websocket;

use websocket::{handle_socket, WsState};

#[tokio::main]
async fn main() {
    // Set a sensible default for logging to ensure we see something
    if std::env::var_os("RUST_LOG").is_none() {
        std::env::set_var("RUST_LOG", "websocket_jsonpatch=debug,tower_http=debug")
    }

    // Initialise the `fmt` subscriber which will print logs to stderr
    tracing_subscriber::fmt::init();

    // Add in our application with the websocket handler
    let app = Router::new()
        .route("/ws", get(ws_handler))
        // Add in a shared websocket state struct `WsState`
        .layer(Extension(Arc::new(WsState::new())));

    // Listen on port 3333 for connections
    let addr: SocketAddr = "127.0.0.1:3333".parse().unwrap();

    debug!("Listening for requests on {}", addr);

    // Start up the server
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}

async fn ws_handler(
    ws: WebSocketUpgrade,
    Extension(state): Extension<Arc<WsState>>,
) -> impl IntoResponse {
    debug!("New Websocket Connection");
    ws.on_upgrade(|socket| handle_socket(socket, state))
}
