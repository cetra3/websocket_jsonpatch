import { applyPatch, Operation } from "fast-json-patch";
import { useEffect, useState } from "react";
import { Todo, TodoAction } from "./Todo";

interface Patch {
  type: "Patch";
  ops: Operation[];
}

interface Full {
  type: "Full";
  todo: Todo;
}

type ServerMessage = Patch | Full;

let websocket: WebSocket | undefined;
let todo: Todo | undefined;

const setupWebsocket = (onTodoUpdate: (todo: Todo) => void) => {
  const loc = window.location;
  const uri = `${loc.protocol === "https:" ? "wss:" : "ws:"}//${loc.host}/ws`;
  console.log(`Connecting websocket: ${uri}`);

  const connection = new WebSocket(uri);

  connection.onopen = () => {
    console.log("Websocket Connected");
    websocket = connection;
  };

  // If we receive a close event the backend has gone away, we try reconnecting in a bit of time
  connection.onclose = (reason) => {
    websocket = undefined;

    // https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent
    if (reason.code !== 1000 && reason.code !== 1001) {
      console.error("Websocket connection closed", reason);

      setTimeout(() => {
        setupWebsocket(onTodoUpdate);
      }, 500);
    }
  };

  connection.onerror = (error) => {
    console.error("Error with websocket", error);
    connection.close();
  };

  connection.onmessage = (message) => {
    const msg = JSON.parse(message.data) as ServerMessage;

    switch (msg.type) {
      case "Patch": {
        if (todo !== undefined) {
          let { newDocument: newTodo } = applyPatch(
            todo,
            msg.ops,
            false,
            false
          );

          onTodoUpdate(newTodo);
          todo = newTodo;
        }
        break;
      }
      case "Full": {
        onTodoUpdate(msg.todo);
        todo = msg.todo;
        break;
      }
    }
  };
};

export const useWebsocket = () => {
  // Keep our local state of the todo app to trigger a render on change
  let [todo, updateTodo] = useState<Todo>();

  useEffect(() => {
    // Update our app state when changes are received
    setupWebsocket((msg) => {
      updateTodo(msg);
    });
    // If the destructor runs, clean up the websocket
    return () => {
      if (websocket) {
        websocket.close(1000);
      }
    };
    // The empty `[]` dependency list makes this `useEffect` callback execute only once on construction
  }, []);

  return todo;
};

export const sendAction = (action: TodoAction): void => {
  if (websocket) {
    websocket.send(JSON.stringify(action));
  }
};
