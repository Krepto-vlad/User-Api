import express, { Request, Response } from "express";
import pool from "../db";
import { authenticateToken } from "../middlewares/authMiddleware";

const router = express.Router();

router.get("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const result = await pool.query(
      "SELECT id, name, email, status, last_login AS \"lastLogin\" FROM users ORDER BY last_login DESC"
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Error fetching users" });
  }
});

router.delete(
  "/:id",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = req.params.id;

    try {
      const result = await pool.query(
        "DELETE FROM users WHERE id = $1 RETURNING id",
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User successfully deleted", userId });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Error deleting user" });
    }
  }
);

router.post(
  "/delete",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { userIds } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ message: "Invalid userIds array" });
    }

    try {
      const query = `
        DELETE FROM users WHERE id = ANY($1::int[]) RETURNING id
      `;
      const result = await pool.query(query, [userIds]);

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "Users not found" });
      }

      res.json({ message: "Users successfully deleted", userIds: result.rows });
    } catch (error) {
      console.error("Error deleting users:", error);
      res.status(500).json({ message: "Error deleting users" });
    }
  }
);

router.patch(
  "/:id/block",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = req.params.id;

    try {
      const result = await pool.query(
        "UPDATE users SET status = 'blocked' WHERE id = $1 RETURNING id, status",
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "User successfully blocked", user: result.rows[0] });
    } catch (error) {
      console.error("Error blocking user:", error);
      res.status(500).json({ message: "Error blocking user" });
    }
  }
);

router.patch(
  "/block",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ message: "No users selected to block" });
    }

    try {
      const query = `
        UPDATE users
        SET status = 'blocked'
        WHERE id = ANY($1)
        RETURNING id, status;
      `;

      const result = await pool.query(query, [userIds]);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "No users found with the provided IDs" });
      }

      res.json({ message: "Users successfully blocked", users: result.rows });
    } catch (error) {
      console.error("Error blocking users:", error);
      res.status(500).json({ message: "Error blocking users" });
    }
  }
);

router.patch(
  "/:id/unblock",
  authenticateToken,
  async (req: Request, res: Response) => {
    const userId = req.params.id;

    try {
      const result = await pool.query(
        "UPDATE users SET status = 'active' WHERE id = $1 RETURNING id, status",
        [userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({
        message: "User successfully unblocked",
        user: result.rows[0],
      });
    } catch (error) {
      console.error("Error unblocking user:", error);
      res.status(500).json({ message: "Error unblocking user" });
    }
  }
);

router.patch(
  "/unblock",
  authenticateToken,
  async (req: Request, res: Response) => {
    const { userIds } = req.body;

    if (!userIds || userIds.length === 0) {
      return res.status(400).json({ message: "No users selected to unblock" });
    }

    try {
      const query = `
        UPDATE users
        SET status = 'active'
        WHERE id = ANY($1)
        RETURNING id, status;
      `;

      const result = await pool.query(query, [userIds]);

      if (result.rowCount === 0) {
        return res
          .status(404)
          .json({ message: "No users found with the provided IDs" });
      }

      res.json({ message: "Users successfully unblocked", users: result.rows });
    } catch (error) {
      console.error("Error unblocking users:", error);
      res.status(500).json({ message: "Error unblocking users" });
    }
  }
);

export default router;
