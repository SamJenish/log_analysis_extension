const diagnostics = [
  {
    pattern: /failed to authenticate/i,
    title: "Authentication failed",
    details:
      "The deployment system failed to authenticate with a remote service. Verify secrets, tokens, and service account credentials.",
  },
  {
    pattern: /permission denied/i,
    title: "Permission denied",
    details:
      "A permissions issue was detected. Check file system permissions, container runtime access, and CI role assignments.",
  },
  {
    pattern: /connection timed out/i,
    title: "Connection timed out",
    details:
      "A network timeout occurred. Validate service availability, firewall settings, and DNS resolution in the deployment environment.",
  },
  {
    pattern: /build failed|failed with exit code|error.*exit code/i,
    title: "Build or test failure",
    details:
      "The pipeline encountered a build or test failure. Inspect the build logs for specific compilation or test assertion errors.",
  },
  {
    pattern: /container failed to start|crash loop backoff|oom killed/i,
    title: "Container runtime failure",
    details:
      "The container did not start successfully. Review the container logs, resource limits, and startup command configuration.",
  },
];

export function analyzeLog(log) {
  const normalized = (log || "").trim();

  if (!normalized) {
    return {
      success: false,
      title: "No log content provided",
      details: "Please paste a deployment log to receive diagnostics.",
    };
  }

  const match = diagnostics.find((item) => item.pattern.test(log));

  if (match) {
    return {
      success: true,
      title: match.title,
      details: `${match.details}\n\nDetected output:\n${normalized.slice(0, 320)}`,
    };
  }

  return {
    success: true,
    title: "Unknown failure pattern",
    details:
      "The log does not match a built-in failure pattern. Consider extending this extension with custom rules or sharing the logs with an AI analysis service.",
  };
}
