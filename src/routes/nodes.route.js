const express = require("express");
const router = express.Router();
const pool = require("../db");

// GET all nodes
router.get("/", async (req, res) => {
  const result = await pool.query(
    "SELECT * FROM nodes WHERE deleted_at IS NULL"
  );
  res.json(result.rows);
});

// CREATE node
router.post("/", async (req, res) => {
  try {
    const { parentId, type, code, name } = req.body;

    if (!type || !name) {
      return res.status(400).json({
        message: "type và name là bắt buộc"
      });
    }

    const result = await pool.query(
      `INSERT INTO nodes (parent_id, type, code, name)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [parentId || null, type, code, name]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({
      message: "Lỗi server",
      error: err.message
    });
  }
});

// DELETE
router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1. Kiểm tra node có tồn tại và chưa bị xóa
    const check = await client.query(
      `SELECT id FROM nodes WHERE id = $1 AND deleted_at IS NULL`,
      [id]
    );

    if (check.rowCount === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({
        message: "Node not found or already deleted",
      });
    }

    // 2. Soft delete toàn bộ cây con bằng CTE đệ quy
    const deleteQuery = `
      WITH RECURSIVE subtree AS (
        SELECT id
        FROM nodes
        WHERE id = $1

        UNION ALL

        SELECT n.id
        FROM nodes n
        INNER JOIN subtree s ON n.parent_id = s.id
      )
      UPDATE nodes
      SET deleted_at = NOW(),
          updated_at = NOW()
      WHERE id IN (SELECT id FROM subtree)
        AND deleted_at IS NULL
      RETURNING id;
    `;

    const result = await client.query(deleteQuery, [id]);

    await client.query("COMMIT");

    return res.json({
      message: "Delete successful",
      deleted_count: result.rowCount,
      deleted_ids: result.rows.map(r => r.id),
    });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("DELETE /nodes error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  } finally {
    client.release();
  }
});


module.exports = router;
