const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const isValid = require("date-fns/isValid");
const addDays = require("date-fns/addDays");
const format = require("date-fns/format");

const databasePath = path.join(__dirname, "todoApplication.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });

    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
let statusArray = ["TO DO", "IN PROGRESS", "DONE"];
let priorityArray = ["HIGH", "MEDIUM", "LOW"];
let categoryArray = ["WORK", "HOME", "LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return requestQuery.category !== undefined && requestQuery.status;
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

let convertDbObject = (data) => {
  return {
    id: data.id,
    todo: data.todo,
    priority: data.priority,
    status: data.status,
    category: data.category,
    dueDate: data.due_date,
  };
};
let checkTodoStatus = (status) => {
  return statusArray.includes(status);
};

let checkTodoPriority = (priority) => {
  return priorityArray.includes(priority);
};

let checkTodoCategory = (category) => {
  return categoryArray.includes(category);
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}'
        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);
      response.send(data.map((each) => convertDbObject(each)));
      break;
    case hasPriorityProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);
      if (checkTodoPriority(priority) === true) {
        response.send(data.map((each) => convertDbObject(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.query):
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%'
        AND status = '${status}';`;
      data = await database.all(getTodosQuery);
      if (checkTodoStatus(status) === true) {
        response.send(data.map((each) => convertDbObject(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategoryProperty(request.query):
      getTodosQuery = `
                    SELECT
                        * 
                    FROM
                        todo 
                    WHERE
                         todo LIKE '%${search_q}%'
                         AND 
                        category="${category}";`;
      data = await database.all(getTodosQuery);
      if (checkTodoCategory(category) === true) {
        response.send(data.map((each) => convertDbObject(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    case hasCategoryAndStatusProperty(request.query):
      getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        category="${category}"
                        AND status = '${status}';`;
      data = await database.all(getTodosQuery);
      response.send(data.map((each) => convertDbObject(each)));
      break;
    case hasCategoryAndPriorityProperty(request.query):
      getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        category="${category}"
                        AND priority = '${priority}';`;
      data = await database.all(getTodosQuery);
      response.send(data.map((each) => convertDbObject(each)));
      break;
    default:
      getTodosQuery = `
      SELECT
        *
      FROM
        todo 
      WHERE
        todo LIKE '%${search_q}%';`;
      data = await database.all(getTodosQuery);
      response.send(data.map((each) => convertDbObject(each)));
  }
});

// getting todos by todoId

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;

  const getTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE
      id = ${todoId};`;
  const todo = await database.get(getTodoQuery);
  if (todo !== undefined) {
    response.send(convertDbObject(todo));
  } else {
    response.send([]);
  }
});

// getting todo by agenda

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;

  if (isValid(new Date(date))) {
    console.log(date);
    let formatDate = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `
        SELECT
        *
        FROM
        todo
        WHERE
        due_date="${formatDate}";`;
    const todo = await database.get(getTodoQuery);
    if (todo === undefined) {
      response.send(todo);
    } else {
      response.send(convertDbObject(todo));
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  let postTodoQuery;
  switch (false) {
    case checkTodoStatus(status):
      response.status(400);
      response.send("Invalid Todo Status");
      break;
    case checkTodoPriority(priority):
      response.status(400);
      response.send("Invalid Todo Priority");
      break;
    case checkTodoCategory(category):
      response.status(400);
      response.send("Invalid Todo Category");
      break;
    case isValid(new Date(dueDate)):
      response.status(400);
      response.send("Invalid Due Date");
      break;
    default:
      let formatDueDate = format(new Date(dueDate), "yyyy-MM-dd");
      postTodoQuery = `
            INSERT INTO
                todo (id, todo, priority, status,category,due_date)
            VALUES
                (${id}, '${todo}', '${priority}', '${status}','${category}','${formatDueDate}');`;
      let postTodo = await database.run(postTodoQuery);

      response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let updateColumn = "";
  const requestBody = request.body;

  const previousTodoQuery = `
    SELECT
      *
    FROM
      todo
    WHERE 
      id = ${todoId};`;
  const previousTodo = await database.get(previousTodoQuery);

  const {
    todo = previousTodo.todo,
    priority = previousTodo.priority,
    status = previousTodo.status,
    category = previousTodo.category,
    dueDate = previousTodo.due_date,
  } = request.body;

  switch (true) {
    case requestBody.status !== undefined:
      if (checkTodoStatus(requestBody.status) === false) {
        response.status(400);
        response.send("Invalid Todo Status");
      } else {
        updateColumn = "Status";
        const updateTodoQuery = `
            UPDATE
            todo
            SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${dueDate}'
            WHERE
            id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`${updateColumn} Updated`);
      }

      break;
    case requestBody.priority !== undefined:
      if (checkTodoPriority(requestBody.priority) === false) {
        response.status(400);
        response.send("Invalid Todo Priority");
      } else {
        updateColumn = "Priority";
        const updateTodoQuery = `
            UPDATE
            todo
            SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${dueDate}'
            WHERE
            id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`${updateColumn} Updated`);
      }

      break;
    case requestBody.todo !== undefined:
      updateColumn = "Todo";
      const updateTodoQuery = `
            UPDATE
            todo
            SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${dueDate}'
            WHERE
            id = ${todoId};`;

      await database.run(updateTodoQuery);
      response.send(`${updateColumn} Updated`);

      break;
    case requestBody.category !== undefined:
      if (checkTodoCategory(requestBody.category) === false) {
        response.status(400);
        response.send("Invalid Todo Category");
      } else {
        updateColumn = "Category";
        const updateTodoQuery = `
            UPDATE
            todo
            SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${dueDate}'
            WHERE
            id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`${updateColumn} Updated`);
      }

      break;
    case requestBody.dueDate !== undefined:
      if (isValid(new Date(requestBody.dueDate)) === false) {
        response.status(400);
        response.send("Invalid Due Date");
      } else {
        console.log("look");
        let formatDueDate = format(new Date(requestBody.dueDate), "yyyy-MM-dd");
        updateColumn = "Due Date";
        const updateTodoQuery = `
            UPDATE
            todo
            SET
            todo='${todo}',
            priority='${priority}',
            status='${status}',
            category='${category}',
            due_date='${formatDueDate}'
            WHERE
            id = ${todoId};`;

        await database.run(updateTodoQuery);
        response.send(`${updateColumn} Updated`);
      }
      break;
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `
  DELETE FROM
    todo
  WHERE
    id = ${todoId};`;

  await database.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
