import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";

// Extend Express Request type
declare global {
  namespace Express {
    interface User {
      id: string;
      email?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      profileImageUrl?: string | null;
      role: string;
    }
  }
}

export async function setupAuth(app: Express) {
  const PgSession = connectPgSimple(session);

  const sessionMiddleware = session({
    store: new PgSession({
      pool,
      tableName: "sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "learntube-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    },
  });

  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  passport.serializeUser((user: Express.User, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Replit Auth callback route
  app.get("/api/callback", async (req, res) => {
    try {
      const userId = req.headers["x-replit-user-id"] as string;
      const userName = req.headers["x-replit-user-name"] as string;
      const userProfileImage = req.headers["x-replit-user-profile-image"] as string;
      const userRoles = req.headers["x-replit-user-roles"] as string;

      if (!userId) {
        return res.redirect("/?error=no_user");
      }

      // Upsert user in database
      const user = await storage.upsertUser({
        id: userId,
        email: userName ? `${userName}@replit.com` : null,
        firstName: userName || null,
        lastName: null,
        profileImageUrl: userProfileImage || null,
        role: userRoles?.includes("admin") ? "admin" : "user",
      });

      // Log user in
      req.login(user, (err) => {
        if (err) {
          console.error("Login error:", err);
          return res.redirect("/?error=login_failed");
        }
        res.redirect("/dashboard");
      });
    } catch (error) {
      console.error("Auth callback error:", error);
      res.redirect("/?error=callback_failed");
    }
  });

  // OIDC-style auth for Replit
  app.get("/api/login", (req, res) => {
    // In Replit, the login is handled by the __replauthuser header
    // Check if user is already authenticated
    const userId = req.headers["x-replit-user-id"] as string;
    
    if (userId) {
      return res.redirect("/api/callback");
    }
    
    // Redirect to Replit's login
    res.redirect(`https://replit.com/auth_with_repl_site?domain=${req.headers.host}`);
  });

  app.get("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) console.error("Logout error:", err);
      res.redirect("/");
    });
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  // Check Replit headers
  const userId = req.headers["x-replit-user-id"] as string;
  
  if (userId && !req.isAuthenticated()) {
    // Auto-login from Replit headers
    storage.getUser(userId).then(async (user) => {
      if (!user) {
        // Create user if doesn't exist
        const userName = req.headers["x-replit-user-name"] as string;
        const userProfileImage = req.headers["x-replit-user-profile-image"] as string;
        
        const newUser = await storage.upsertUser({
          id: userId,
          email: userName ? `${userName}@replit.com` : null,
          firstName: userName || null,
          lastName: null,
          profileImageUrl: userProfileImage || null,
          role: "user",
        });
        
        req.login(newUser, (err) => {
          if (err) return res.status(401).json({ message: "Unauthorized" });
          next();
        });
      } else {
        req.login(user, (err) => {
          if (err) return res.status(401).json({ message: "Unauthorized" });
          next();
        });
      }
    }).catch(() => {
      res.status(401).json({ message: "Unauthorized" });
    });
    return;
  }

  if (req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({ message: "Unauthorized" });
};

// Middleware to check if user is admin
export const isAdmin: RequestHandler = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    return next();
  }
  res.status(403).json({ message: "Forbidden - Admin access required" });
};
