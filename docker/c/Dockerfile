FROM gcc:13
WORKDIR /workspace
RUN useradd -m judgeuser && chown -R judgeuser:judgeuser /workspace
USER judgeuser
CMD ["gcc", "--version"]
