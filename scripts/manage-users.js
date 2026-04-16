#!/usr/bin/env node

/**
 * User management utility for PostgreSQL-backed CoreX environments.
 *
 * Usage:
 *   node scripts/manage-users.js create <username> <password>
 *   node scripts/manage-users.js list
 *   node scripts/manage-users.js update <username> <newPassword>
 *   node scripts/manage-users.js delete <username>
 *   node scripts/manage-users.js reset-password <username>
 */

let pool;
let bcrypt;

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function resolveDbConfig() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
    };
  }

  const required = [
    "DATABASE_HOST",
    "DATABASE_PORT",
    "DATABASE_NAME",
    "DATABASE_USER",
    "DATABASE_PASSWORD",
  ];
  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Faltan variables de entorno para la BD: ${missing.join(", ")}`);
  }

  return {
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    database: process.env.DATABASE_NAME,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  };
}

async function initDependencies() {
  const [{ Pool }, bcryptModule] = await Promise.all([
    import("pg"),
    import("bcryptjs"),
  ]);

  bcrypt = bcryptModule.default;
  pool = new Pool(resolveDbConfig());
}

async function createUser(username, password) {
  try {
    if (!username || !password) {
      log("Uso: node scripts/manage-users.js create <username> <password>", "red");
      return;
    }

    if (password.length < 6) {
      log("La contrasena debe tener al menos 6 caracteres.", "red");
      return;
    }

    log("Creando usuario...", "yellow");

    const hash = await bcrypt.hash(password, 10);

    await pool.query(
      "INSERT INTO public.users (username, password_hash) VALUES ($1, $2)",
      [username.trim().toLowerCase(), hash],
    );

    log(`Usuario '${username}' creado exitosamente.`, "green");
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      log(`El usuario '${username}' ya existe.`, "red");
      return;
    }

    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");
  }
}

async function listUsers() {
  try {
    log("Obteniendo usuarios...", "yellow");

    const result = await pool.query(
      "SELECT id, username, is_active, created_at FROM public.users ORDER BY created_at DESC",
    );

    if (result.rows.length === 0) {
      log("No hay usuarios en la base de datos.", "yellow");
      return;
    }

    log("\nUSUARIOS EN LA BD:\n", "blue");
    result.rows.forEach((user, index) => {
      const status = user.is_active ? "ACTIVO" : "INACTIVO";
      log(`  ${index + 1}. ${user.username}`, "green");
      log(`     ID: ${user.id} | Estado: ${status}`);
      log(`     Creado: ${user.created_at.toLocaleString()}`);
    });
    log("");
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");
  }
}

async function updatePassword(username, newPassword) {
  try {
    if (!username || !newPassword) {
      log("Uso: node scripts/manage-users.js update <username> <newPassword>", "red");
      return;
    }

    if (newPassword.length < 6) {
      log("La contrasena debe tener al menos 6 caracteres.", "red");
      return;
    }

    log("Actualizando contrasena...", "yellow");

    const hash = await bcrypt.hash(newPassword, 10);
    const result = await pool.query(
      "UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING username",
      [hash, username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      log(`Usuario '${username}' no encontrado.`, "red");
      return;
    }

    log(`Contrasena de '${username}' actualizada.`, "green");
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");
  }
}

async function deleteUser(username) {
  try {
    if (!username) {
      log("Uso: node scripts/manage-users.js delete <username>", "red");
      return;
    }

    if (username === "admin") {
      log("No se elimina el usuario admin desde este script sin un paso manual adicional.", "yellow");
      return;
    }

    log("Eliminando usuario...", "yellow");

    const result = await pool.query(
      "DELETE FROM public.users WHERE username = $1 RETURNING username",
      [username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      log(`Usuario '${username}' no encontrado.`, "red");
      return;
    }

    log(`Usuario '${username}' eliminado.`, "green");
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");
  }
}

async function resetPassword(username) {
  try {
    if (!username) {
      log("Uso: node scripts/manage-users.js reset-password <username>", "red");
      return;
    }

    log('Reseteando contrasena a "password123"...', "yellow");

    const hash = await bcrypt.hash("password123", 10);
    const result = await pool.query(
      "UPDATE public.users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE username = $2 RETURNING username",
      [hash, username.trim().toLowerCase()],
    );

    if (result.rows.length === 0) {
      log(`Usuario '${username}' no encontrado.`, "red");
      return;
    }

    log(`Contrasena de '${username}' reseteada a "password123".`, "green");
    log("Cambiala inmediatamente con: update <username> <newPassword>", "yellow");
  } catch (error) {
    log(`Error: ${error instanceof Error ? error.message : String(error)}`, "red");
  }
}

async function main() {
  const [, , command, arg1, arg2] = process.argv;

  try {
    await initDependencies();

    switch (command) {
      case "create":
        await createUser(arg1, arg2);
        break;
      case "list":
        await listUsers();
        break;
      case "update":
        await updatePassword(arg1, arg2);
        break;
      case "delete":
        await deleteUser(arg1);
        break;
      case "reset-password":
        await resetPassword(arg1);
        break;
      default:
        log("\nUSER MANAGEMENT SCRIPT\n", "blue");
        log("Uso:", "yellow");
        log("  node scripts/manage-users.js create <username> <password>");
        log("  node scripts/manage-users.js list");
        log("  node scripts/manage-users.js update <username> <newPassword>");
        log("  node scripts/manage-users.js delete <username>");
        log("  node scripts/manage-users.js reset-password <username>\n");
    }
  } catch (error) {
    log(`Error fatal: ${error instanceof Error ? error.message : String(error)}`, "red");
    process.exitCode = 1;
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

void main();
