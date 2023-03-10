const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const app = express();
app.use(express.json());

const DBPath = path.join(__dirname, "covid19IndiaPortal.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: DBPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000/");
    });
  } catch (e) {
    console.log("Database Connection failed!!");
  }
};
initializeDBAndServer();

const authenticateUser = (request, response, next) => {
  const DBUser = request.headers["authorization"];
  let jwtToken;
  if (DBUser === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwtToken = DBUser.split(" ")[1];
    const payload = jwt.verify(jwtToken, "ghdgkjghgsjdfj", (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        next();
      }
    });
  }
};

//API 1

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const query = `select * from user where username='${username}';`;
  const dbUser = await db.get(query);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const passwordMatched = await bcrypt.compare(password, dbUser.password);
    if (!passwordMatched) {
      response.status(400);
      response.send("Invalid password");
    } else {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "ghdgkjghgsjdfj");
      console.log(jwtToken);
      response.send({ jwtToken });
    }
  }
});

//API 2
app.get("/states/", authenticateUser, async (request, response) => {
  const query = `select * from state;`;
  const allStates = await db.all(query);
  let res = [];
  allStates.forEach((element) => {
    const { state_id, state_name, population } = element;
    let obj = {
      stateId: state_id,
      stateName: state_name,
      population: population,
    };
    res.push(obj);
  });

  response.send(res);
});

//API 3
app.get("/states/:stateId/", authenticateUser, async (request, response) => {
  const { stateId } = request.params;
  const query = `select * from state where state_id=${stateId};`;
  const getState = await db.get(query);

  const { state_id, state_name, population } = getState;
  let obj = {
    stateId: state_id,
    stateName: state_name,
    population: population,
  };

  response.send(obj);
});

//API 4
app.post("/districts/", authenticateUser, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query = `
  insert into district (district_name,state_id,cases,cured,active,deaths)
  values(
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths}
  );
  `;
  await db.run(query);

  response.send("District Successfully Added");
});

//API 5
app.get(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `select * from district where district_id=${districtId};`;
    const getDistrict = await db.get(query);

    const {
      district_id,
      district_name,
      state_id,
      cases,
      cured,
      active,
      deaths,
    } = getDistrict;
    let obj = {
      districtId: district_id,
      districtName: district_name,
      stateId: state_id,
      cases: cases,
      cured: cured,
      active: active,
      deaths: deaths,
    };

    response.send(obj);
  }
);

//API 6
app.delete(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const query = `delete from district where district_id=${districtId};`;
    await db.run(query);
    response.send("District Removed");
  }
);

//API 7
app.put(
  "/districts/:districtId/",
  authenticateUser,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const query = `
  update district set
  district_name='${districtName}',
  state_id=${stateId},
  cases=${cases},
  cured=${cured},
  active=${active},
  deaths= ${deaths}
  where district_id=${districtId};
  `;
    await db.run(query);

    response.send("District Details Updated");
  }
);
//API 8
app.get(
  "/states/:stateId/stats/",
  authenticateUser,
  async (request, response) => {
    const { stateId } = request.params;
    const query = `select sum(cases) as totalCases,
    sum(cured) as totalCured,
    sum(active) as totalActive,
    sum(deaths) as totalDeaths
    from district where state_id=${stateId};`;
    const getStats = await db.get(query);

    const { totalCases, totalCured, totalActive, totalDeaths } = getStats;
    let obj = {
      totalCases: totalCases,
      totalCured: totalCured,
      totalActive: totalActive,
      totalDeaths: totalDeaths,
    };

    response.send(obj);
  }
);

module.exports = app;
