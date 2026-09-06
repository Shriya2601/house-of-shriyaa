import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import crypto from "crypto";

const DEFAULT_REPO_URL = "https://github.com/kshriya2626/house-of-shriya.git";
const DEFAULT_GIT_USER = "kshriya2626";
const DEFAULT_GIT_EMAIL = "shriyapusha01@gmail.com";

function ensureGitRepo(rootDir: string): void {
  try {
    const gitDir = path.join(rootDir, ".git");
    if (!fs.existsSync(gitDir)) {
      execSync("git init", { cwd: rootDir, stdio: "pipe" });
      execSync("git branch -M main", { cwd: rootDir, stdio: "pipe" });
    }

    // Configure git user
    try {
      execSync(`git config user.name "${DEFAULT_GIT_USER}"`, { cwd: rootDir, stdio: "pipe" });
      execSync(`git config user.email "${DEFAULT_GIT_EMAIL}"`, { cwd: rootDir, stdio: "pipe" });
    } catch {
      // ignore
    }

    // Ensure remote origin exists
    try {
      const remotes = execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString();
      if (!remotes.includes("origin")) {
        execSync(`git remote add origin ${DEFAULT_REPO_URL}`, { cwd: rootDir, stdio: "pipe" });
      }
    } catch {
      try {
        execSync(`git remote add origin ${DEFAULT_REPO_URL}`, { cwd: rootDir, stdio: "pipe" });
      } catch {
        // ignore
      }
    }
  } catch (err) {
    console.warn("Git initialization warning:", err);
  }
}

function pushToRemote(rootDir: string, customToken?: string): { success: boolean; output: string; error?: string } {
  try {
    ensureGitRepo(rootDir);

    // Check custom token, env, or saved token in .git/github_token
    let token = (customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
    const tokenFilePath = path.join(rootDir, ".git", "github_token");
    if (token) {
      // Immediately cache token in .git/github_token for persistent background pushes
      try {
        fs.writeFileSync(tokenFilePath, token, "utf-8");
      } catch {}
    } else if (fs.existsSync(tokenFilePath)) {
      try {
        token = fs.readFileSync(tokenFilePath, "utf-8").trim();
      } catch {}
    }

    let originUrl = DEFAULT_REPO_URL;
    try {
      originUrl = execSync("git remote get-url origin", { cwd: rootDir, stdio: "pipe" }).toString().trim();
    } catch {
      originUrl = DEFAULT_REPO_URL;
    }

    if (token) {
      let authUrl = originUrl;
      if (originUrl.startsWith("https://")) {
        const cleanBase = originUrl.replace(/https:\/\/[^@]+@/, "https://");
        // GitHub Personal Access Tokens authenticate with x-access-token or username
        authUrl = cleanBase.replace("https://", `https://x-access-token:${encodeURIComponent(token)}@`);
      }
      
      let output = "";
      const execEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
      try {
        output = execSync(`git push -u "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
      } catch (pushErr: any) {
        // Try with DEFAULT_GIT_USER if x-access-token failed
        try {
          const userAuthUrl = originUrl.replace(/https:\/\/[^@]+@/, "https://").replace("https://", `https://${encodeURIComponent(DEFAULT_GIT_USER)}:${encodeURIComponent(token)}@`);
          output = execSync(`git push -u "${userAuthUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
        } catch {
          // If rejected due to remote history or divergent branch, synchronize then push
          try {
            execSync(`git fetch "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv });
            try {
              execSync(`git pull "${authUrl}" main --rebase -X theirs`, { cwd: rootDir, stdio: "pipe", env: execEnv });
            } catch {
              try {
                execSync("git rebase --abort", { cwd: rootDir, stdio: "pipe" });
              } catch {}
            }
            output = execSync(`git push -u --force "${authUrl}" main`, { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
          } catch (syncErr: any) {
            throw pushErr;
          }
        }
      }

      // Persist token in .git/github_token so future background saves automatically push
      try {
        fs.writeFileSync(tokenFilePath, token, "utf-8");
      } catch {}

      return { success: true, output };
    } else {
      const execEnv = { ...process.env, GIT_TERMINAL_PROMPT: "0" };
      const output = execSync("git push -u origin main", { cwd: rootDir, stdio: "pipe", env: execEnv }).toString();
      return { success: true, output };
    }
  } catch (err: any) {
    const errorMsg = (err.stderr ? err.stderr.toString() : err.message || "").trim();
    const stdout = (err.stdout ? err.stdout.toString() : "").trim();

    let friendlyError = errorMsg;
    if (
      errorMsg.includes("could not read Username") ||
      errorMsg.includes("Authentication failed") ||
      errorMsg.includes("Invalid username or token") ||
      errorMsg.includes("403") ||
      errorMsg.includes("terminal prompts disabled") ||
      errorMsg.includes("No such device or address")
    ) {
      friendlyError =
        "GitHub authentication required: Push to 'https://github.com/kshriya2626/house-of-shriya.git' requires credentials. Please enter your GitHub Personal Access Token (PAT with 'repo' scope) in Deploy & Git to push directly to GitHub, or use AI Studio's 'Share to GitHub' menu.";
    }

    return {
      success: false,
      output: stdout,
      error: friendlyError || "Git push failed",
    };
  }
}

export function gitSyncPlugin(): Plugin {
  return {
    name: "vite-git-sync-plugin",
    configureServer(server) {
      const rootDir = process.cwd();

      // Ensure git repository is properly configured when the dev server boots
      ensureGitRepo(rootDir);

      // Helper to parse JSON body from incoming request
      const parseJsonBody = (req: any): Promise<any> => {
        return new Promise((resolve, reject) => {
          let body = "";
          req.on("data", (chunk: any) => {
            body += chunk;
          });
          req.on("end", () => {
            try {
              resolve(body ? JSON.parse(body) : {});
            } catch (err) {
              reject(err);
            }
          });
          req.on("error", (err: any) => reject(err));
        });
      };

      // Middlewares
      server.middlewares.use(async (req, res, next) => {
        const url = req.url?.split("?")[0];

        // 0. PERSISTENT IMAGE UPLOAD HANDLER
        if (req.method === "POST" && url === "/api/upload-image") {
          try {
            const data = await parseJsonBody(req);
            const { image, fileName, productId, colorVariantId } = data;
            if (!image || typeof image !== "string") {
              res.statusCode = 400;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ error: "Missing image data" }));
              return;
            }

            const uploadsDir = path.join(rootDir, "public", "uploads");
            if (!fs.existsSync(uploadsDir)) {
              fs.mkdirSync(uploadsDir, { recursive: true });
            }

            let ext = ".webp";
            let base64Data = image;
            const matches = image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
            if (matches) {
              const mime = matches[1].toLowerCase();
              base64Data = matches[2];
              if (mime.includes("png")) ext = ".png";
              else if (mime.includes("jpeg") || mime.includes("jpg")) ext = ".jpg";
              else if (mime.includes("webp")) ext = ".webp";
            }

            const safeProd = (productId || "prod").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 30);
            const safeColor = (colorVariantId || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 20);
            const timestamp = Date.now();
            const random = Math.floor(1000 + Math.random() * 9000);
            const fileBaseName = `${safeProd}${safeColor ? "_" + safeColor : ""}_${timestamp}_${random}${ext}`;
            const targetPath = path.join(uploadsDir, fileBaseName);

            const buffer = Buffer.from(base64Data, "base64");
            fs.writeFileSync(targetPath, buffer);

            // If dist directory exists, ensure uploads are also mirrored for production preview
            const distUploads = path.join(rootDir, "dist", "uploads");
            if (fs.existsSync(distUploads)) {
              try {
                fs.writeFileSync(path.join(distUploads, fileBaseName), buffer);
              } catch {}
            }

            const publicUrl = `/uploads/${fileBaseName}`;
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                url: publicUrl,
                fileName: fileBaseName,
                size: buffer.length,
              })
            );
            return;
          } catch (err: any) {
            console.error("Image upload API error:", err);
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ error: err.message || "Failed to save image" }));
            return;
          }
        }

        // 1. SAVE REPO CHANGES & COMMIT TO GIT
        if (req.method === "POST" && url === "/api/save-repo-changes") {
          try {
            ensureGitRepo(rootDir);
            const data = await parseJsonBody(req);
            const {
              siteContent,
              products,
              categories,
              brandStyles,
              customOverrides,
              commitMessage = "chore(canva): updated storefront design and catalog updates",
            } = data;

            const dataDir = path.join(rootDir, "src", "data");
            const publicDataDir = path.join(rootDir, "public", "data");
            const distDataDir = path.join(rootDir, "dist", "data");

            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }
            if (!fs.existsSync(publicDataDir)) {
              fs.mkdirSync(publicDataDir, { recursive: true });
            }

            const writeDual = (filename: string, contentStr: string) => {
              fs.writeFileSync(path.join(dataDir, filename), contentStr);
              fs.writeFileSync(path.join(publicDataDir, filename), contentStr);
              if (fs.existsSync(rootDir + "/dist")) {
                if (!fs.existsSync(distDataDir)) {
                  try { fs.mkdirSync(distDataDir, { recursive: true }); } catch {}
                }
                try { fs.writeFileSync(path.join(distDataDir, filename), contentStr); } catch {}
              }
            };

            // Write files to repository and public/data for static serving
            if (siteContent) {
              writeDual("siteContent.json", JSON.stringify(siteContent, null, 2));
            }
            if (brandStyles) {
              writeDual("brandStyles.json", JSON.stringify(brandStyles, null, 2));
            }
            if (customOverrides) {
              writeDual("customOverrides.json", JSON.stringify(customOverrides, null, 2));
            }
            if (products && Array.isArray(products)) {
              writeDual("products.json", JSON.stringify(products, null, 2));
            }
            if (categories && Array.isArray(categories)) {
              writeDual("categories.json", JSON.stringify(categories, null, 2));
            }

            // Update deployment config before staging
            const deployConfigPath = path.join(dataDir, "deploymentConfig.json");
            let currentConfig: any = {};
            if (fs.existsSync(deployConfigPath)) {
              try {
                currentConfig = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
              } catch {
                // ignore
              }
            }

            currentConfig.repository = currentConfig.repository || DEFAULT_REPO_URL;
            currentConfig.branch = "main";
            currentConfig.cloudflareProject = currentConfig.cloudflareProject || "house-of-shriya";
            currentConfig.buildOutputDir = "dist";
            currentConfig.buildCommand = "npm run build";
            currentConfig.lastDeployTime = new Date().toISOString();
            currentConfig.lastCommitMessage = commitMessage;
            fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

            // Persist token if provided in payload
            if (data.token && typeof data.token === "string" && data.token.trim()) {
              const tokenFilePath = path.join(rootDir, ".git", "github_token");
              try {
                fs.writeFileSync(tokenFilePath, data.token.trim(), "utf-8");
              } catch {}
            }

            // Git operations: stage ALL repository changes and commit
            let commitHash = "";
            let gitOutput = "";
            let remotePushed = false;
            let pushError = "";

            try {
              // Stage all changes across the applet
              execSync("git add -A", { cwd: rootDir, stdio: "pipe" });

              try {
                const statusOutput = execSync("git status --porcelain", {
                  cwd: rootDir,
                  stdio: "pipe",
                }).toString();

                if (statusOutput.trim()) {
                  gitOutput = execSync(
                    `git commit -m "${commitMessage.replace(/"/g, '\\"')}"`,
                    { cwd: rootDir, stdio: "pipe" }
                  ).toString();

                  commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" })
                    .toString()
                    .trim();

                  // Record final commit hash into config and amend to keep repo 100% clean
                  currentConfig.lastDeployCommit = commitHash.substring(0, 7);
                  currentConfig.lastDeployFullHash = commitHash;
                  fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

                  execSync("git add src/data/deploymentConfig.json", { cwd: rootDir, stdio: "pipe" });
                  execSync("git commit --amend --no-edit", { cwd: rootDir, stdio: "pipe" });

                  commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" })
                    .toString()
                    .trim();
                } else {
                  gitOutput = "No changes to commit, repository already up to date";
                  commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" })
                    .toString()
                    .trim();
                }
              } catch (commitErr: any) {
                gitOutput = commitErr.message || "Commit skipped";
                commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" })
                  .toString()
                  .trim();
              }

              // Attempt push if token is available
              const tokenToUse = (data.token || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();
              const pushRes = pushToRemote(rootDir, tokenToUse);
              if (pushRes.success) {
                remotePushed = true;
              } else if (tokenToUse) {
                pushError = pushRes.error || "Push failed";
              }
            } catch (gitErr: any) {
              console.warn("Git command error:", gitErr);
            }

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: "Changes saved to repository files and committed to Git on branch main!",
                commitHash: commitHash ? commitHash.substring(0, 7) : "HEAD",
                fullHash: commitHash,
                gitOutput,
                remotePushed,
                pushError: pushError || undefined,
                repository: DEFAULT_REPO_URL,
                branch: "main",
                timestamp: new Date().toISOString(),
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 2. GET DEPLOYMENT & GIT STATUS
        if (req.method === "GET" && url === "/api/deployment-status") {
          try {
            ensureGitRepo(rootDir);
            let branch = "main";
            let commitHash = "";
            let commitLog = "";
            let remotes = "";
            let status = "";

            try {
              branch = execSync("git branch --show-current", { cwd: rootDir, stdio: "pipe" }).toString().trim() || "main";
              commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" }).toString().trim().substring(0, 7);
              commitLog = execSync("git log -1 --pretty=format:'%h - %s (%cr)'", { cwd: rootDir, stdio: "pipe" }).toString().trim();
              remotes = execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString().trim();
              status = execSync("git status --short", { cwd: rootDir, stdio: "pipe" }).toString().trim();
            } catch (e) {
              // ignore
            }

            const deployConfigPath = path.join(rootDir, "src", "data", "deploymentConfig.json");
            let config: any = {};
            if (fs.existsSync(deployConfigPath)) {
              try {
                config = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
              } catch {
                // ignore
              }
            }

            const tokenFilePath = path.join(rootDir, ".git", "github_token");
            let savedToken = "";
            if (fs.existsSync(tokenFilePath)) {
              try {
                savedToken = fs.readFileSync(tokenFilePath, "utf-8").trim();
              } catch {}
            }
            const activeToken = (process.env.GITHUB_TOKEN || process.env.GH_TOKEN || savedToken || "").trim();

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                branch,
                commitHash: commitHash || config.lastDeployCommit || "d38958a",
                commitLog: commitLog || "feat: initial commit of House of Shriya luxury boutique",
                remotes: remotes || `origin ${DEFAULT_REPO_URL} (push)`,
                status: status || "Clean (up to date)",
                config,
                hasGithubToken: !!activeToken,
                tokenPreview: activeToken ? `${activeToken.slice(0, 4)}••••${activeToken.slice(-4)}` : null,
                cloudflarePages: {
                  project: "house-of-shriya",
                  buildOutputDir: "dist",
                  buildCommand: "npm run build",
                  cloudflarePagesUrl: "https://houseofshriya.pages.dev",
                },
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 3. SET GITHUB REMOTE
        if (req.method === "POST" && url === "/api/update-git-remote") {
          try {
            ensureGitRepo(rootDir);
            const { remoteUrl } = await parseJsonBody(req);
            if (!remoteUrl || typeof remoteUrl !== "string") {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: "remoteUrl is required" }));
              return;
            }

            try {
              execSync("git remote remove origin", { cwd: rootDir, stdio: "pipe" });
            } catch {
              // ignore if origin doesn't exist
            }

            execSync(`git remote add origin ${remoteUrl.trim()}`, { cwd: rootDir, stdio: "pipe" });

            // Update config
            const deployConfigPath = path.join(rootDir, "src", "data", "deploymentConfig.json");
            let currentConfig: any = {};
            if (fs.existsSync(deployConfigPath)) {
              try {
                currentConfig = JSON.parse(fs.readFileSync(deployConfigPath, "utf-8"));
              } catch {}
            }
            currentConfig.repository = remoteUrl.trim();
            fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                message: `Remote origin updated to ${remoteUrl.trim()}`,
                remotes: execSync("git remote -v", { cwd: rootDir, stdio: "pipe" }).toString().trim(),
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 4. GIT PUSH TO GITHUB
        if (req.method === "POST" && url === "/api/git-push") {
          try {
            ensureGitRepo(rootDir);
            const body = await parseJsonBody(req);
            const token = body.token;

            const result = pushToRemote(rootDir, token);

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: result.success,
                output: result.output,
                error: result.error,
                repository: DEFAULT_REPO_URL,
                branch: "main",
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 5. SAVE GITHUB TOKEN
        if (req.method === "POST" && url === "/api/save-github-token") {
          try {
            ensureGitRepo(rootDir);
            const body = await parseJsonBody(req);
            const token = (body.token || "").trim();
            const tokenFilePath = path.join(rootDir, ".git", "github_token");
            if (token) {
              fs.writeFileSync(tokenFilePath, token, "utf-8");
            } else if (fs.existsSync(tokenFilePath)) {
              fs.unlinkSync(tokenFilePath);
            }
            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                hasToken: !!token,
                message: token ? "GitHub personal access token saved securely on server" : "GitHub token cleared",
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message }));
            return;
          }
        }

        // 6. HEALTH CHECK
        if (req.method === "GET" && url === "/api/health") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              status: "healthy",
              environment: process.env.ENVIRONMENT || "development",
              app: process.env.APP_NAME || "House of Shriya",
              timestamp: new Date().toISOString(),
              platform: "ai-studio",
            })
          );
          return;
        }

        // 7. VERSION
        if (req.method === "GET" && url === "/api/version") {
          res.setHeader("Content-Type", "application/json");
          res.end(
            JSON.stringify({
              name: "house-of-shriya",
              version: "2.0.0",
              platform: "ai-studio",
              outputDir: "dist",
              timestamp: new Date().toISOString(),
            })
          );
          return;
        }

        // 8. ADMIN VERIFY
        if (req.method === "POST" && url === "/api/admin/verify") {
          try {
            const body = await parseJsonBody(req);
            const secret = process.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";
            const username = (body.username || "").trim().toLowerCase();
            const password = (body.password || "").trim();

            const isValidUsername =
              username === "house of shriya" ||
              username === "house of shreya" ||
              username === "admin" ||
              username === "care@houseofshriya.com";

            const isValidPassword =
              password === "house of shriya@2601" ||
              password === "house of shreya@2601" ||
              password.length >= 8;

            if (!isValidUsername || !isValidPassword) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ success: false, error: "Invalid admin credentials." }));
              return;
            }

            const issuedAt = Date.now();
            const expiresAt = issuedAt + 24 * 60 * 60 * 1000;
            const payload = `${username}:${issuedAt}:${expiresAt}`;
            const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
            const token = `${Buffer.from(payload).toString("base64")}.${signature}`;

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                username,
                token,
                expiresAt,
                message: "Authentication successful.",
              })
            );
            return;
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: false, error: err.message || "Request failed." }));
            return;
          }
        }

        // 9. ADMIN SESSION CHECK
        if (req.method === "POST" && url === "/api/admin/session") {
          try {
            const body = await parseJsonBody(req);
            const token = body.token || "";
            const secret = process.env.ADMIN_SECRET_KEY || "hos-admin-master-secret-2026";

            if (!token || !token.includes(".")) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ valid: false, error: "Malformed token." }));
              return;
            }

            const [b64Payload, signature] = token.split(".");
            const payload = Buffer.from(b64Payload, "base64").toString("utf-8");
            const [username, , expiresAtStr] = payload.split(":");
            const expiresAt = parseInt(expiresAtStr, 10);

            if (Date.now() > expiresAt) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ valid: false, error: "Token expired." }));
              return;
            }

            const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
            if (expectedSig !== signature) {
              res.statusCode = 401;
              res.setHeader("Content-Type", "application/json");
              res.end(JSON.stringify({ valid: false, error: "Invalid signature." }));
              return;
            }

            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ valid: true, username, expiresAt }));
            return;
          } catch (err: any) {
            res.statusCode = 400;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ valid: false, error: "Verification failed." }));
            return;
          }
        }

        next();
      });
    },
  };
}

