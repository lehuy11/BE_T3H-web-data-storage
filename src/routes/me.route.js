const express = require("express");
const router = express.Router();
const pool = require("../db");

const auth = require("../middlewares/auth");
const requireRole = require("../middlewares/requireRole");

/* =====================================================
   GET ALL NODES (user + admin)
===================================================== */
router.get("/tree", auth, async (req, res) => {
  try {
    const user = req.user; // { id, role }

    // DEV: mock scope
    let scopeCondition = "";
    if (user.role === "unit_manager") {
      scopeCondition = `
        AND root.type = 'ST_UNIT'
      `;
    }

    const result = await pool.query(`
      WITH RECURSIVE tree AS (
        SELECT n.*
        FROM nodes n
        WHERE n.deleted_at IS NULL
          AND n.parent_id IS NULL
        UNION ALL
        SELECT c.*
        FROM nodes c
        JOIN tree p ON p.id = c.parent_id
        WHERE c.deleted_at IS NULL
      )
      SELECT *
      FROM tree
      ORDER BY parent_id NULLS FIRST, sort_order
    `);

    res.json({
      user,
      tree: result.rows,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

/* =====================================================
   CREATE NODE (admin only)
===================================================== */
router.post("/", auth, requireRole("admin"), async (req, res) => {
  const client = await pool.connect();

  try {
    const {
      parentId,
      type,
      code,
      name,
      sort_order,

      material,
      quantity,
      valid,
      expires,
      status,
    } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        message: "type và name là bắt buộc",
      });
    }

    await client.query("BEGIN");

    const nodeResult = await client.query(
      `
      INSERT INTO nodes (parent_id, type, code, name, sort_order)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [parentId || null, type, code || null, name, sort_order || 0],
    );

    const node = nodeResult.rows[0];

    if (type === "asset") {
      await client.query(
        `
        UPDATE assets
        SET
          material = COALESCE($1, material),
          quantity = COALESCE($2, quantity),
          valid    = COALESCE($3, valid),
          expires  = $4,
          status   = COALESCE($5, status)
        WHERE node_id = $6
        `,
        [
          material,
          quantity,
          valid,
          expires,
          status,
          node.id,
        ],
      );
    }

    await client.query("COMMIT");

    res.json(node);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error(err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

/* =====================================================
   UPDATE NODE (admin only)
===================================================== */
router.put("/:id", auth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;
  const { parent_id, type, code, name, sort_order } = req.body;

  if (!type || !name) {
    return res.status(400).json({
      message: "type và name là bắt buộc",
    });
  }

  try {
    const result = await pool.query(
      `
      UPDATE nodes
      SET
        parent_id = $1,
        type = $2,
        code = $3,
        name = $4,
        sort_order = $5,
        updated_at = NOW()
      WHERE id = $6
        AND deleted_at IS NULL
      RETURNING *
      `,
      [parent_id, type, code, name, sort_order, id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Node không tồn tại" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   DELETE NODE (admin only – SAFE)
===================================================== */
router.delete("/:id", auth, requireRole("admin"), async (req, res) => {
  const { id } = req.params;

  try {
    const nodeResult = await pool.query(
      `
      SELECT id
      FROM nodes
      WHERE id = $1
        AND deleted_at IS NULL
      `,
      [id],
    );

    if (nodeResult.rowCount === 0) {
      return res.status(404).json({
        error: "NOT_FOUND",
        message: "Node không tồn tại hoặc đã bị xóa",
      });
    }

    const childResult = await pool.query(
      `
      SELECT 1
      FROM nodes
      WHERE parent_id = $1
        AND deleted_at IS NULL
      LIMIT 1
      `,
      [id],
    );

    if (childResult.rowCount > 0) {
      return res.status(409).json({
        error: "HAS_CHILDREN",
        message: "Không thể xóa node vì vẫn còn node con",
      });
    }

    await pool.query(
      `
      UPDATE nodes
      SET deleted_at = NOW()
      WHERE id = $1
      `,
      [id],
    );

    res.json({
      success: true,
      deleted_id: id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "SERVER_ERROR" });
  }
});

module.exports = router;
