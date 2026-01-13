FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install pandas scikit-learn flask flask-cors
COPY . .
EXPOSE 5001
CMD ["python", "predict_service.py"]