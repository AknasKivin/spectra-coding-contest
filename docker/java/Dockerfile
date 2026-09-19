FROM openjdk:17-slim
WORKDIR /workspace
RUN useradd -m judgeuser && chown -R judgeuser:judgeuser /workspace
USER judgeuser
CMD ["java", "-version"]
