const pool = require("../db");

/**
 * Lấy cây node theo quyền user
 * @param {Object} reqUser - user từ JWT / middleware
 */
exports.getUserTree = async (reqUser) => {
  /* =========================
     1. Lấy thông tin user
  ========================= */
  const userResult = await pool.query(
    `
    SELECT id, user_name, full_name, role
    FROM users
    WHERE id = $1
      AND deleted_at IS NULL
    `,
    [reqUser.id]
  );

  if (userResult.rowCount === 0) {
    throw new Error("USER_NOT_FOUND");
  }

  const user = userResult.rows[0];

  /* =========================
     2. Query theo role
  ========================= */
  let treeResult;

  // ================= ADMIN =================
  if (user.role === "admin") {
    treeResult = await pool.query(`
      WITH RECURSIVE tree AS (
        SELECT *
        FROM nodes
        WHERE parent_id IS NULL
          AND deleted_at IS NULL

        UNION ALL

        SELECT c.*
        FROM nodes c
        JOIN tree p ON p.id = c.parent_id
        WHERE c.deleted_at IS NULL
      )
      SELECT *
      FROM tree
      ORDER BY parent_id NULLS FIRST, sort_order, created_at
    `);
  }

  // ================= USER =================
  else {
    treeResult = await pool.query(
      `
      WITH RECURSIVE ancestors AS (
        -- node user được gán
        SELECT n.*
        FROM nodes n
        JOIN user_nodes un
          ON un.node_id = n.id
         AND un.user_id = $1
        WHERE n.deleted_at IS NULL

        UNION ALL

        -- truy ngược lên node cha
        SELECT parent.*
        FROM nodes parent
        JOIN ancestors a ON a.parent_id = parent.id
        WHERE parent.deleted_at IS NULL
      )
      SELECT DISTINCT *
      FROM ancestors
      ORDER BY parent_id NULLS FIRST, sort_order, created_at
      `,
      [user.id]
    );
  }

  /* =========================
     3. Response
  ========================= */
  return {
    user,
    tree: treeResult.rows,
  };
};
