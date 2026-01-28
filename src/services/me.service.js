const pool = require("../db");

exports.getUserTree = async (user) => {
  // 1️⃣ Xác định scope theo role
  let rootCondition = "";
  if (user.role === "unit_manager") {
    rootCondition = `AND n.type = 'ST_UNIT'`;
  }

  // 2️⃣ Query cây node
  const result = await pool.query(`
    WITH RECURSIVE tree AS (
      SELECT n.*
      FROM nodes n
      WHERE n.deleted_at IS NULL
        AND n.parent_id IS NULL
        ${rootCondition}

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

  // 3️⃣ Trả về đúng format API
  return {
    user,
    tree: result.rows,
  };
};
