# Forge.dev backend — Flask app served by gunicorn.
#
# IMPORTANT: this container talks to the HOST's Docker daemon (via the
# /var/run/docker.sock bind mount in docker-compose.yml) to run the code
# sandbox — it does NOT run Docker-in-Docker, and it does not need the
# `docker` CLI installed, because the `docker` Python package (docker-py,
# already in requirements.txt) speaks the Docker Engine API directly over
# that socket. This is the "Docker-outside-of-Docker" pattern.
#
# The container runs as root so it can read/write the mounted socket
# without fiddling with matching a host GID inside the image. That's an
# accepted tradeoff for a capstone deployment — anyone who can reach this
# container can effectively control the host's Docker daemon, so don't
# expose this port directly to the internet (Nginx sits in front of it,
# see docker-compose.yml + nginx/).

FROM python:3.12-slim

WORKDIR /app

# System deps: gcc for any C-extension wheels that don't ship prebuilt
# wheels for this platform, plus default-libmysqlclient-dev headers are
# NOT needed since we use PyMySQL (pure Python), not mysqlclient.
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# 2 workers is plenty for a capstone demo; each sandbox run spawns its own
# short-lived Docker container rather than blocking a worker for long, but
# keep threads on so slow AI-plagiarism calls don't stall other requests.
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--threads", "4", "--timeout", "120", "app:app"]
