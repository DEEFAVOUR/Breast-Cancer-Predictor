from flask import Flask, request, jsonify, redirect
from flask_cors import CORS
import joblib
import numpy as np
import sqlite3

app = Flask(__name__)
CORS(app)

model = joblib.load("best_model.pkl")
scaler = joblib.load("scaler.pkl")

conn = sqlite3.connect("cancer_users.db", check_same_thread=False)
c = conn.cursor()
c.execute('''
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    mean_radius REAL,
    mean_perimeter REAL,
    mean_area REAL,
    mean_concavity REAL,
    mean_concave_points REAL,
    worst_radius REAL,
    worst_perimeter REAL,
    worst_area REAL,
    worst_concavity REAL,
    worst_concave_points REAL,
    prediction INTEGER
)
''')
conn.commit()

@app.route("/")
def index():
    return redirect("/static/index.html")

@app.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.json
        username = data['username']
        mean_radius = float(data['meanRadius'])
        mean_perimeter = float(data['meanPerimeter'])
        mean_area = float(data['meanArea'])
        mean_concavity = float(data['meanConcavity'])
        mean_concave_points = float(data['meanConcavePoints'])
        worst_radius = float(data['worstRadius'])
        worst_perimeter = float(data['worstPerimeter'])
        worst_area = float(data['worstArea'])
        worst_concavity = float(data['worstConcavity'])
        worst_concave_points = float(data['worstConcavePoints'])

        # Create a feature array with zeros for all 30 features
        # This assumes your model was trained on all 30 features
        feature_names = ['mean radius', 'mean texture', 'mean perimeter', 'mean area',
                         'mean smoothness', 'mean compactness', 'mean concavity',
                         'mean concave points', 'mean symmetry', 'mean fractal dimension',
                         'radius error', 'texture error', 'perimeter error', 'area error',
                         'smoothness error', 'compactness error', 'concavity error',
                         'concave points error', 'symmetry error', 'fractal dimension error',
                         'worst radius', 'worst texture', 'worst perimeter', 'worst area',
                         'worst smoothness', 'worst compactness', 'worst concavity',
                         'worst concave points', 'worst symmetry', 'worst fractal dimension']
        
        # Create a feature array with zeros
        X_input = np.zeros((1, len(feature_names)))
        
        # Set the values for the features we have
        # Find the indices for our features
        mean_radius_idx = feature_names.index('mean radius')
        mean_perimeter_idx = feature_names.index('mean perimeter')
        mean_area_idx = feature_names.index('mean area')
        mean_concavity_idx = feature_names.index('mean concavity')
        mean_concave_points_idx = feature_names.index('mean concave points')
        worst_radius_idx = feature_names.index('worst radius')
        worst_perimeter_idx = feature_names.index('worst perimeter')
        worst_area_idx = feature_names.index('worst area')
        worst_concavity_idx = feature_names.index('worst concavity')
        worst_concave_points_idx = feature_names.index('worst concave points')
        
        # Set the values
        X_input[0, mean_radius_idx] = mean_radius
        X_input[0, mean_perimeter_idx] = mean_perimeter
        X_input[0, mean_area_idx] = mean_area
        X_input[0, mean_concavity_idx] = mean_concavity
        X_input[0, mean_concave_points_idx] = mean_concave_points
        X_input[0, worst_radius_idx] = worst_radius
        X_input[0, worst_perimeter_idx] = worst_perimeter
        X_input[0, worst_area_idx] = worst_area
        X_input[0, worst_concavity_idx] = worst_concavity
        X_input[0, worst_concave_points_idx] = worst_concave_points
        
        # Scale the input
        X_scaled = scaler.transform(X_input)
        prediction = model.predict(X_scaled)[0]
        
        # Log the prediction value to the terminal
        print("="*50)
        print(f"PREDICTION LOG:")
        print(f"User: {username}")
        print(f"Input values - Mean Radius: {mean_radius}, Mean Perimeter: {mean_perimeter}")
        print(f"              Mean Area: {mean_area}, Mean Concavity: {mean_concavity}")
        print(f"              Mean Concave Points: {mean_concave_points}")
        print(f"              Worst Radius: {worst_radius}, Worst Perimeter: {worst_perimeter}")
        print(f"              Worst Area: {worst_area}, Worst Concavity: {worst_concavity}")
        print(f"              Worst Concave Points: {worst_concave_points}")
        print(f"Prediction: {int(prediction)} ({'Malignant' if prediction == 1 else 'Benign'})")
        print("="*50)

        # Insert into database
        c.execute("""
            INSERT INTO users 
            (username, mean_radius, mean_perimeter, mean_area, mean_concavity, mean_concave_points,
             worst_radius, worst_perimeter, worst_area, worst_concavity, worst_concave_points, prediction) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (username, mean_radius, mean_perimeter, mean_area, mean_concavity, mean_concave_points,
              worst_radius, worst_perimeter, worst_area, worst_concavity, worst_concave_points, int(prediction)))
        conn.commit()

        return jsonify({"prediction": int(prediction)})
    except Exception as e:
        # Log the error for debugging
        print(f"Error in prediction: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route("/users", methods=["GET"])
def get_users():
    c.execute("SELECT * FROM users")
    rows = c.fetchall()
    users = []
    for row in rows:
        users.append({
            "id": row[0],
            "username": row[1],
            "mean_radius": row[2],
            "mean_perimeter": row[3],
            "mean_area": row[4],
            "mean_concavity": row[5],
            "mean_concave_points": row[6],
            "worst_radius": row[7],
            "worst_perimeter": row[8],
            "worst_area": row[9],
            "worst_concavity": row[10],
            "worst_concave_points": row[11],
            "prediction": row[12]
        })
    return jsonify(users)

@app.route("/clear-db", methods=["POST"])
def clear_db():
    try:
        c.execute("DELETE FROM users")
        conn.commit()
        return jsonify({"message": "Database cleared successfully"})
    except Exception as e:
        print(f"Error clearing database: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    # Use this for local development
    app.run(debug=True)
    # The production server (Render) will use the app object directly
