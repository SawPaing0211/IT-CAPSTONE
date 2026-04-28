# ─── Adventure Realm: Java Sandbox ──────────────────────────────────────────
FROM eclipse-temurin:21-jdk-alpine

# ── Security: unprivileged user ───────────────────────────────────────────────
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

# ── Prepare directories ───────────────────────────────────────────────────────
RUN mkdir -p /tmp/sandbox && chown sandbox:sandbox /tmp/sandbox

# ── Copy runner script ────────────────────────────────────────────────────────
COPY run_java.sh /usr/local/bin/run_java.sh
RUN chmod +x /usr/local/bin/run_java.sh

USER sandbox
WORKDIR /tmp/sandbox

ENTRYPOINT ["sh", "/usr/local/bin/run_java.sh"]