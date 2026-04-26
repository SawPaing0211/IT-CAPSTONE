# ─── Adventure Realm: Java Sandbox ──────────────────────────────────────────
# Eclipse Temurin is the most trusted OpenJDK distro — slim variant for speed
FROM eclipse-temurin:21-jdk-alpine

# ── Security: unprivileged user ───────────────────────────────────────────────
RUN addgroup -S sandbox && adduser -S -G sandbox sandbox

# ── Prepare writable scratch space ───────────────────────────────────────────
RUN mkdir -p /tmp/sandbox && chown sandbox:sandbox /tmp/sandbox

USER sandbox
WORKDIR /tmp/sandbox

# ── Entrypoint: compile then run ─────────────────────────────────────────────
#    We use a tiny shell wrapper so we can do javac + java in one container call
COPY --chown=sandbox:sandbox run_java.sh /usr/local/bin/run_java.sh

ENTRYPOINT ["sh", "/usr/local/bin/run_java.sh"]