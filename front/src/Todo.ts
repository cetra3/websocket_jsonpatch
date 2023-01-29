export interface Todo {
  name: string;
  todos: { [index: number]: TodoRow };
}

export interface TodoRow {
  name: string;
  completed: boolean;
}

export interface Add {
  type: "Add";
  row: TodoRow;
}

export interface ChangeName {
  type: "ChangeName";
  name: string;
}

export interface Update {
  type: "Update";
  row: TodoRow;
  index: number;
}

export interface Remove {
  type: "Remove";
  index: number;
}

export interface RemoveCompleted {
  type: "RemoveCompleted";
}

export type TodoAction = Add | ChangeName | Update | Remove | RemoveCompleted;
