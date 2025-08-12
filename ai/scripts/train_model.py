# scripts/train_model.py

import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
import joblib
from pathlib import Path

def train_and_save_model(data_path='data/synthetic_election_data.csv',
                         model_folder='model',
                         model_filename='participation_model.pkl',
                         max_candidates=10):
    """
    Train a linear regression model using synthetic election data,
    and save the trained model in the specified folder with the specified filename.
    """

    # Load synthetic data from CSV
    df = pd.read_csv(data_path)

    # Prepare feature columns dynamically based on max_candidates
    feature_cols = ['registered_voters', 'vote_datetime']
    for idx in range(max_candidates):
        feature_cols.append(f'votes_per_candidate_{idx+1}')
        feature_cols.append(f'registered_per_candidate_{idx+1}')

    X = df[feature_cols]
    y = df['actual_voters']

    # Split data
    X_train, X_test, y_train, y_test = train_test_split(X, y,
                                                        test_size=0.2,
                                                        random_state=42)

    # Train model
    model = LinearRegression()
    model.fit(X_train, y_train)

    # Use pathlib.Path for folder and file management
    models_dir = Path(model_folder)
    models_dir.mkdir(parents=True, exist_ok=True)  # Create folder if not exists

    model_path = models_dir / model_filename  # Save the trained model
    joblib.dump(model, model_path)
    print(f"Model trained and saved to {model_path}.")

if __name__ == "__main__":
    train_and_save_model()
