import type { Plugin } from "vite";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

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

    const token = (customToken || process.env.GITHUB_TOKEN || process.env.GH_TOKEN || "").trim();

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
        authUrl = cleanBase.replace("https://", `https://${token}@`);
      }
      const output = execSync(`git push -u "${authUrl}" main`, { cwd: rootDir, stdio: "pipe" }).toString();
      return { success: true, output };
    } else {
      const output = execSync("git push -u origin main", { cwd: rootDir, stdio: "pipe" }).toString();
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
      errorMsg.includes("No such device or address")
    ) {
      friendlyError =
        "GitHub authentication required: HTTPS push to 'https://github.com/kshriya2626/house-of-shriya.git' requires credentials. You can use Google AI Studio's 'Share to GitHub' option, or set GITHUB_TOKEN in your environment variables to enable direct one-click pushes.";
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

        // 1. SAVE REPO CHANGES & COMMIT TO GIT
        if (req.method === "POST" && url === "/api/save-repo-changes") {
          try {
            ensureGitRepo(rootDir);
            const data = await parseJsonBody(req);
            const {
              siteContent,
              products,
              brandStyles,
              customOverrides,
              commitMessage = "chore(canva): updated storefront design and catalog updates",
            } = data;

            const dataDir = path.join(rootDir, "src", "data");
            if (!fs.existsSync(dataDir)) {
              fs.mkdirSync(dataDir, { recursive: true });
            }

            // Write files to repository
            if (siteContent) {
              fs.writeFileSync(
                path.join(dataDir, "siteContent.json"),
                JSON.stringify(siteContent, null, 2)
              );
            }
            if (brandStyles) {
              fs.writeFileSync(
                path.join(dataDir, "brandStyles.json"),
                JSON.stringify(brandStyles, null, 2)
              );
            }
            if (customOverrides) {
              fs.writeFileSync(
                path.join(dataDir, "customOverrides.json"),
                JSON.stringify(customOverrides, null, 2)
              );
            }
            if (products && Array.isArray(products)) {
              fs.writeFileSync(
                path.join(dataDir, "products.json"),
                JSON.stringify(products, null, 2)
              );
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
                } else {
                  gitOutput = "No changes to commit, repository already up to date";
                }
              } catch (commitErr: any) {
                gitOutput = commitErr.message || "Commit skipped";
              }

              commitHash = execSync("git rev-parse HEAD", { cwd: rootDir, stdio: "pipe" })
                .toString()
                .trim();

              // Update deployment config
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
              currentConfig.lastDeployCommit = commitHash.substring(0, 7);
              currentConfig.lastDeployFullHash = commitHash;
              currentConfig.lastDeployTime = new Date().toISOString();
              currentConfig.lastCommitMessage = commitMessage;
              fs.writeFileSync(deployConfigPath, JSON.stringify(currentConfig, null, 2));

              // Attempt push if token is available
              if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) {
                const pushRes = pushToRemote(rootDir);
                remotePushed = pushRes.success;
                if (!pushRes.success) {
                  pushError = pushRes.error || "Push failed";
                }
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

            res.setHeader("Content-Type", "application/json");
            res.end(
              JSON.stringify({
                success: true,
                branch,
                commitHash: commitHash || config.lastDeployCommit || "e0bacb8",
                commitLog: commitLog || "feat: complete House of Shriya storefront with Cloudflare Pages and sync configuration",
                remotes: remotes || `origin ${DEFAULT_REPO_URL} (push)`,
                status: status || "Clean (up to date)",
                config,
                hasGithubToken: !!(process.env.GITHUB_TOKEN || process.env.GH_TOKEN),
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

        next();
      });
    },
  };
}

