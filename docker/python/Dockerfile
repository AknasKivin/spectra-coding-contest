FROM python:3.12-slim

RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*
WORKDIR /workspace
COPY . /workspace
RUN useradd -m judgeuser && chown -R judgeuser:judgeuser /workspace
USER judgeuser

CMD ["python", "-V"]
