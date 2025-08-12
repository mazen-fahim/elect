# scripts/generate_data.py

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

def generate_synthetic_data(num_samples=100, max_candidates=10):
    """
    Generate synthetic election data with a variable number of candidates.
    The data will be saved as a CSV file in the data/ directory.
    """

    np.random.seed(42)  # For reproducibility
    data = []

    base_time = datetime.now()  # Starting point for vote_datetime

    for i in range(num_samples):
        registered_voters = np.random.randint(1000, 5000)  # Total registered voters for this sample
        vote_datetime = base_time + timedelta(hours=i)    # Vote time increments by 1 hour for each sample
        actual_voters = np.random.randint(int(0.3 * registered_voters), registered_voters)  # Actual voters count

        # Random number of candidates for this sample (between 1 and max_candidates)
        num_candidates = np.random.randint(1, max_candidates + 1)

        # Distribute actual voters among candidates randomly
        votes_per_candidate = np.random.multinomial(actual_voters, [1/num_candidates]*num_candidates)

        # Distribute registered voters among candidates randomly
        registered_per_candidate = np.random.multinomial(registered_voters, [1/num_candidates]*num_candidates)

        # Create a dictionary to hold the sample data
        sample = {
            'registered_voters': registered_voters,
            'vote_datetime': vote_datetime.timestamp(),  # Convert datetime to UNIX timestamp (float)
            'actual_voters': actual_voters,
            'num_candidates': num_candidates,
        }

        # Add votes and registered voters per candidate dynamically
        # If there are fewer candidates than max_candidates, fill missing fields with 0
        for idx in range(max_candidates):
            if idx < num_candidates:
                sample[f'votes_per_candidate_{idx+1}'] = votes_per_candidate[idx]
                sample[f'registered_per_candidate_{idx+1}'] = registered_per_candidate[idx]
            else:
                sample[f'votes_per_candidate_{idx+1}'] = 0
                sample[f'registered_per_candidate_{idx+1}'] = 0

        data.append(sample)

    # Convert list of dicts to DataFrame
    df = pd.DataFrame(data)

    # Save DataFrame to CSV file
    df.to_csv('data/synthetic_election_data.csv', index=False)
    print(f"Generated {num_samples} samples with up to {max_candidates} candidates each.")

if __name__ == "__main__":
    generate_synthetic_data(num_samples=200, max_candidates=10)
