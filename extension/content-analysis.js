const diagnostics = [
  {
    pattern: /failed to authenticate/i,
    title: "Authentication failed",
    summary:
      "The pipeline failed to authenticate with a remote service or credential provider. This usually means a secret, token, or OAuth credential was rejected or missing.",
    guidance:
      "Inspect the connection between your CI/CD runner and the external service. Confirm that the configured credentials are valid, that the token has not expired, and that the service account has the required permissions. If you are using a secret or environment variable, verify it is present in the pipeline configuration and not blocked by a variable masking policy.",
  },
  {
    pattern: /permission denied/i,
    title: "Permission denied",
    summary:
      "The selected error indicates the process lacks the rights to access a file, directory, or external resource. This happens frequently when a pipeline step tries to read or write protected files or access container resources without sufficient privileges.",
    guidance:
      "Review user access and file permissions for the account used by the build agent or container runtime. Check whether the pipeline is running as a restricted service account, whether filesystem paths are mounted read-only, and whether any CI environment restrictions are blocking the operation. Correct the permission model or adjust the access policy to allow the expected action.",
  },
  {
    pattern: /connection timed out/i,
    title: "Connection timed out",
    summary:
      "A network timeout means the pipeline could not establish a connection to a remote endpoint before the request expired. This is often caused by unreachable services, firewall rules, DNS resolution failures, or overloaded infrastructure.",
    guidance:
      "Check the target endpoint and verify that it is reachable from the CI/CD environment. Confirm DNS settings, proxy configuration, and network routing. If the service is behind a firewall or VPC, ensure the runner has the correct access path and that there are no transient outages. You may also need to increase request timeouts if the dependency is slow to respond.",
  },
  {
    pattern: /build failed|failed with exit code|error.*exit code/i,
    title: "Build or test failure",
    summary:
      "The pipeline has ended in a build or test failure, typically because source code compilation failed, a dependency was missing, or an automated test assertion failed.",
    guidance:
      "Open the full build log and locate the first failing command or compiler error message. Confirm that required toolchains and dependencies are installed, and ensure the working directory and environment variables are correct. For test failures, reproduce the failing test locally to identify the root cause in the test or application code.",
  },
  {
    pattern: /container failed to start|crash loop backoff|oom killed/i,
    title: "Container runtime failure",
    summary:
      "The error points to a container startup or runtime issue. The container may be failing due to an application crash, misconfiguration, or resource exhaustion.",
    guidance:
      "Inspect the container logs and runtime settings. Verify the startup command, environment variables, port bindings, and mounted volumes. Check whether the container is hitting memory or CPU limits, and whether the image itself can run successfully in a local environment. Update the container configuration to match the expected deployment requirements.",
  },
];

function buildLongExplanation(selectedText, match) {
  const detection = match
    ? `The selection appears to map to a recognized failure class: ${match.title}.`
    : `The selection does not match one of the built-in patterns, but it still looks like a deployment failure that deserves deeper inspection.`;

  const baseDescription = match
    ? match.summary
    : "This type of failure is often caused by configuration drift, incorrect credentials, missing resources, or a runtime incompatibility. The selected text indicates that a CI/CD pipeline or container environment experienced an interruption or rejection during its execution.";

  const actionSection = match
    ? match.guidance
    : "Start by isolating the failing step and identifying the exact resource or command that triggered the error. Check pipeline variables, service endpoints, container image configuration, and environment-specific settings to determine whether the issue is caused by infrastructure, permissions, or a bad deployment artifact.";

  const finalSection =
    "Once you identify the root cause, apply a targeted fix and rerun the affected pipeline stage. If the issue is authentication-related, renew or rotate the credential and verify access policies. If it is permissions-related, update the service account or filesystem access settings. If it is a network or runtime failure, validate endpoint reachability and resource limits. Document the fix so the same class of issue can be prevented in future deployments.";

  const explanation = [
    `Selected error snippet:\n${selectedText}`,
    detection,
    baseDescription,
    actionSection,
    finalSection,
  ].join("\n\n");

  return explanation;
}

function cleanSelectionText(text) {
  return (text || "").trim().replace(/\s+/g, " ");
}

function analyzeSelection(log) {
  const normalized = cleanSelectionText(log);

  if (!normalized) {
    return {
      success: false,
      title: "No selection provided",
      details: "Please select the error text on the screen to generate an explanation.",
    };
  }

  const match = diagnostics.find((item) => item.pattern.test(normalized));
  const title = match ? match.title : "Failure explanation";
  const details = buildLongExplanation(normalized, match);

  return {
    success: true,
    title,
    details,
  };
}

window.LogFailureAnalyzer = {
  analyzeSelection,
};
