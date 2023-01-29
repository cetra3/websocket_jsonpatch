use std::collections::BTreeMap;

use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct Todo {
    // The main name of the todo list
    name: String,
    // The list of todos
    todos: BTreeMap<u32, TodoRow>,
}

#[derive(Serialize, Deserialize, Default, Debug, Clone)]
pub struct TodoRow {
    // The name of the specific todo
    name: String,
    // Whether this todo is completed or not
    completed: bool,
}

#[derive(Deserialize)]
#[serde(tag = "type")]
pub enum TodoAction {
    Add { row: TodoRow },
    ChangeName { name: String },
    Update { index: u32, row: TodoRow },
    Remove { index: u32 },
    RemoveCompleted,
}

impl Todo {
    pub fn apply(&mut self, action: TodoAction) {
        match action {
            TodoAction::Add { row } => {
                // Find the next available index
                let index = self.todos.keys().max().copied().unwrap_or_default() + 1;

                // Insert this into our map
                self.todos.insert(index, row);
            }
            TodoAction::Update { row, index } => {
                self.todos.insert(index, row);
            }
            // Change the name of the todo list
            TodoAction::ChangeName { name } => self.name = name,
            TodoAction::Remove { index } => {
                self.todos.remove(&index);
            }
            // Filter and remove all completed todo rows
            TodoAction::RemoveCompleted => self.todos.retain(|_, val| !val.completed),
        }
    }
}
