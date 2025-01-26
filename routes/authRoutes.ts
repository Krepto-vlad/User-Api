import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../db";
import { body, validationResult } from "express-validator";

const router = express.Router();
const SECRET = process.env.JWT_SECRET || 'test-secret';

router.post(
  "/register",
  [
    body("name").notEmpty().withMessage("Name is required"),
    body("surname").notEmpty().withMessage("Last name is required"),
    body("email").isEmail().withMessage("Valid email is required"),
    body("password")
      .isLength({ min: 1 })
      .withMessage("Password must be at least 1 characters"),
  ],
   // @ts-ignore
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, surname, email, password } = req.body;
    const last_login = new Date();

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE email = $1",
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ message: "Email already exists" });
    }

    try {
      const hashedPassword = await bcrypt.hash(password, 10);

      const query = `
        INSERT INTO users (name, surname, email, password, last_login)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id, name, surname, email, status, last_login;
      `;
      const values = [name, surname, email, hashedPassword, last_login];
      const result = await pool.query(query, values);

      res.status(201).json({
        user: result.rows[0],
        token: jwt.sign(
          { id: result.rows[0].id, email: result.rows[0].email },
          SECRET,
          { expiresIn: "1h" }
        ),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to register user" });
    }
  }
);

router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
   // @ts-ignore
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const userQuery = `SELECT * FROM users WHERE email = $1;`;
      const userResult = await pool.query(userQuery, [email]);

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const user = userResult.rows[0];

      if (user.status === "blocked") {
        return res
          .status(403)
          .json({ message: "Your account is blocked. Contact support." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const updateQuery = `
        UPDATE users
        SET last_login = NOW()
        WHERE email = $1
        RETURNING id, last_login;
      `;
      await pool.query(updateQuery, [email]);

      const token = jwt.sign({ id: user.id, email: user.email }, SECRET, {
        expiresIn: "1h",
      });

      res.status(200).json({ token });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Failed to login" });
    }
  }
);

export default router;
