const fs = require("fs");
const pool = require("../db");

async function importNode(node, parentId = null) {
  const { id, type, name, children, ...asset } = node;

  const result = await pool.query(
    `INSERT INTO nodes (parent_id, type, code, name)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [parentId, type, id, name]
  );

  const nodeId = result.rows[0].id;

  if (type === "asset") {
    await pool.query(
      `INSERT INTO asset_details (node_id, material, unit, valid_from, expires, note)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        nodeId,
        asset.material || null,
        asset.unit || null,
        asset.validFrom || null,
        asset.expires || null,
        asset.note || null,
      ]
    );
  }

  for (const child of children || []) {
    await importNode(child, nodeId);
  }
}

async function run() {
  const raw = fs.readFileSync("data/stationData.json");
  const data = JSON.parse(raw);

  for (const root of data) {
    await importNode(root);
  }

  console.log("IMPORT DONE");
  process.exit();
}

run();
