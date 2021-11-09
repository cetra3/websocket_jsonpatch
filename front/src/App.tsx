import "./App.scss";

import { Todo, TodoRow } from "./Todo";
import { sendAction, useWebsocket } from "./Websocket";

function App() {
  const todo = useWebsocket();

  return (
    <div className="container grid-lg">
      <div className="columns">
        <div className="column col-lg-12 todo-title">
          <h1>Todo App Example</h1>
        </div>
      </div>
      {todo === undefined && <div className="loading loading-lg"></div>}
      {todo && <TodoComponent todo={todo} />}
    </div>
  );
}

function TodoComponent({ todo }: { todo: Todo }) {
  return (
    <>
      <div className="form-horizontal">
        <div className="form-group">
          <div className="col-2 col-lg-12">
            <label className="form-label" htmlFor="name">
              <strong>Todo List Name</strong>
            </label>
          </div>
          <div className="col-10 col-lg-12">
            <input
              className="form-input"
              type="text"
              id="name"
              placeholder="Shopping List"
              value={todo.name}
              onChange={(ev) => {
                sendAction({
                  type: "ChangeName",
                  name: ev.currentTarget.value,
                });
              }}
            />
          </div>
        </div>
      </div>
      {Object.entries(todo.todos).map(([index, row]) => (
        <TodoRowComponent key={index} row={row} index={+index} />
      ))}
      <div className="columns">
        <div className="column col-lg-12 todo-buttons">
          <div className="btn-group">
            {Object.entries(todo.todos).some(([, val]) => val.completed) && (
              <button
                className="btn"
                onClick={() => {
                  sendAction({
                    type: "RemoveCompleted",
                  });
                }}
              >
                Remove Completed
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => {
                sendAction({
                  type: "Add",
                  row: {
                    name: "",
                    completed: false,
                  },
                });
              }}
            >
              Add Todo
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

function TodoRowComponent({ row, index }: { row: TodoRow; index: number }) {
  return (
    <div className="columns">
      <div className="column col-lg-12 todo-row">
        <div className="input-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={row.completed}
              onChange={() =>
                sendAction({
                  type: "Update",
                  row: {
                    ...row,
                    completed: !row.completed,
                  },
                  index,
                })
              }
            />
            <i className="form-icon"></i>
          </label>
          <input
            className={`form-input ${row.completed ? "completed" : ""}`}
            value={row.name}
            type="text"
            placeholder="Add Todo Here!"
            onChange={(ev) =>
              sendAction({
                type: "Update",
                row: {
                  ...row,
                  name: ev.currentTarget.value,
                },
                index,
              })
            }
          />

          <button
            className="btn input-group-btn"
            onClick={() =>
              sendAction({
                type: "Remove",
                index,
              })
            }
          >
            <i className="icon icon-cross"></i>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
