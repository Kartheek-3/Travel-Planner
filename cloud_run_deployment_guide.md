# 🚀 Deploying the Smart Travel Planner to Google Cloud Run

This guide provides step-by-step instructions for containerizing and deploying your full-stack AI-Powered Travel Planner application to **Google Cloud Run**.

We have implemented a **Single-Container Unified Architecture** where the backend server (either Python Flask or Node.js Express) serves the compiled static Vite React frontend. This setup is highly recommended for production because:
1. **Cost Efficiency**: You only pay for one active container, which scales down to **zero instances** when idle.
2. **Zero CORS Issues**: The frontend and backend share the exact same host and port, eliminating Cross-Origin Resource Sharing issues.
3. **No Code Changes**: Frontend fetches are relative (`/get-routes`), which work out of the box in production.

---

## 🛠️ Prerequisites

Before you start, ensure you have:
1. A **Google Cloud Project** (e.g., `cineevent-5a275`).
2. The [Google Cloud SDK (gcloud CLI)](https://cloud.google.com/sdk/docs/install) installed and configured on your machine.
3. Billing enabled on your GCP project.
4. Python or Node.js Dockerfile (already created in the project root):
   - [Dockerfile](file:///e:/travel-planner-ai-master/Dockerfile) (Python + React)
   - [Dockerfile.node](file:///e:/travel-planner-ai-master/Dockerfile.node) (Node.js + React)

---

## 🔒 Step 1: Secure GCP Authentication & Secrets

### 1. Zero-Key Authentication (Service Accounts)
You **must not** embed your service account JSON file (`gcp-key.json`) inside your Docker image. Instead, when deployed on Cloud Run, the Google Cloud SDK automatically uses the **Default Compute Engine Service Account** (or a custom service account) assigned to the container.

To allow the container to access **BigQuery**, **Cloud Storage**, and **Vertex AI (Gemini)**, grant these IAM roles to your service account:

```bash
# Get your project number
PROJECT_NUMBER=$(gcloud projects describe cineevent-5a275 --format="value(projectNumber)")

# Define the default Compute Engine service account email
SERVICE_ACCOUNT="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

# Grant BigQuery Editor roles (to stream analytics)
gcloud projects add-iam-policy-binding cineevent-5a275 \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/bigquery.dataEditor"

# Grant Cloud Storage Admin/ObjectCreator roles (to save searches)
gcloud projects add-iam-policy-binding cineevent-5a275 \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/storage.objectUser"

# Grant Vertex AI User roles (for Gemini)
gcloud projects add-iam-policy-binding cineevent-5a275 \
    --member="serviceAccount:${SERVICE_ACCOUNT}" \
    --role="roles/aiplatform.user"
```

### 2. Move Keys to Secret Manager (Recommended)
Rather than passing sensitive API keys as plain environment variables, store them in **Google Cloud Secret Manager**:

```bash
# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secrets for your API keys
gcloud secrets create GOOGLE_MAPS_API_KEY --data-file=- <<< "YOUR_MAPS_API_KEY"
gcloud secrets create GEMINI_API_KEY --data-file=- <<< "YOUR_GEMINI_API_KEY"
gcloud secrets create OPENWEATHER_API_KEY --data-file=- <<< "YOUR_OPENWEATHER_API_KEY"
gcloud secrets create FCM_SERVER_KEY --data-file=- <<< "YOUR_FCM_SERVER_KEY"

# Grant the Service Account access to read these secrets
gcloud secrets add-iam-policy-binding GOOGLE_MAPS_API_KEY --role="roles/secretmanager.secretAccessor" --member="serviceAccount:${SERVICE_ACCOUNT}"
gcloud secrets add-iam-policy-binding GEMINI_API_KEY --role="roles/secretmanager.secretAccessor" --member="serviceAccount:${SERVICE_ACCOUNT}"
gcloud secrets add-iam-policy-binding OPENWEATHER_API_KEY --role="roles/secretmanager.secretAccessor" --member="serviceAccount:${SERVICE_ACCOUNT}"
gcloud secrets add-iam-policy-binding FCM_SERVER_KEY --role="roles/secretmanager.secretAccessor" --member="serviceAccount:${SERVICE_ACCOUNT}"
```

---

## 🚀 Step 2: Deploying to Cloud Run

You do **not** need a local Docker installation! We will use Google Cloud Build to compile your container image in the cloud, register it, and deploy it to Cloud Run.

### Option A: Deploy Python Flask Backend + React Frontend (Recommended)
Run the following single command in the project root directory:

```bash
# Deploy using the primary Python Dockerfile
gcloud run deploy travel-planner-python \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="BIGQUERY_TABLE_ID=cineevent-5a275.travel_dataset.travel_data,CLOUD_FUNCTION_URL=https://us-central1-cineevent-5a275.cloudfunctions.net/processTravelData" \
  --update-secrets="GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest,FCM_SERVER_KEY=FCM_SERVER_KEY:latest"
```

### Option B: Deploy Node.js Express Backend + React Frontend
If you prefer to run the Node.js implementation, run:

```bash
# Deploy using the Node Dockerfile.node configuration
gcloud run deploy travel-planner-node \
  --source . \
  --file Dockerfile.node \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="BIGQUERY_TABLE_ID=cineevent-5a275.travel_dataset.travel_data,CLOUD_FUNCTION_URL=https://us-central1-cineevent-5a275.cloudfunctions.net/processTravelData" \
  --update-secrets="GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest,FCM_SERVER_KEY=FCM_SERVER_KEY:latest"
```

*Note: Once the deployment finishes, the terminal will display a live URL (e.g., `https://travel-planner-python-xxxxx-uc.a.run.app`). Open this URL in any browser to see your app running live in the cloud!*

---

## 🤖 Step 3: CI/CD Pipeline with Cloud Build (Optional)

To automate deployments every time you push code to GitHub or GitLab, you can create a `cloudbuild.yaml` file in the root.

Here is a ready-to-use production pipeline file:

```yaml
steps:
  # 1. Build the unified Docker container
  - name: 'gcr.io/cloud-builders/docker'
    args: [
      'build',
      '-t', 'gcr.io/$PROJECT_ID/travel-planner-app:$COMMIT_SHA',
      '-f', 'Dockerfile',
      '.'
    ]

  # 2. Push the image to Artifact Registry
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/travel-planner-app:$COMMIT_SHA']

  # 3. Deploy the container image to Cloud Run
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - 'run'
      - 'deploy'
      - 'travel-planner-app'
      - '--image'
      - 'gcr.io/$PROJECT_ID/travel-planner-app:$COMMIT_SHA'
      - '--region'
      - 'us-central1'
      - '--platform'
      - 'managed'
      - '--allow-unauthenticated'
      - '--set-env-vars'
      - 'BIGQUERY_TABLE_ID=cineevent-5a275.travel_dataset.travel_data'
      - '--update-secrets'
      - 'GOOGLE_MAPS_API_KEY=GOOGLE_MAPS_API_KEY:latest,GEMINI_API_KEY=GEMINI_API_KEY:latest,OPENWEATHER_API_KEY=OPENWEATHER_API_KEY:latest,FCM_SERVER_KEY=FCM_SERVER_KEY:latest'

images:
  - 'gcr.io/$PROJECT_ID/travel-planner-app:$COMMIT_SHA'
```

To submit this pipeline manually to test it:
```bash
gcloud builds submit --config cloudbuild.yaml .
```

---

## 💡 Troubleshooting & Tips

1. **Viewing Logs**: If you see any errors or blank pages, view the live container streaming logs:
   ```bash
   gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=travel-planner-python" --limit 50
   ```
2. **Cold Starts**: Cloud Run containers spin down to 0 instances when inactive. The first request after a while might take 3-5 seconds (cold start). To prevent cold starts, you can set a minimum number of instances:
   ```bash
   gcloud run services update travel-planner-python --min-instances 1 --region us-central1
   ```
3. **Database Files**: Since Cloud Run is stateless, local SQLite files (`local_travel_planner.db`) will reset every time a container restarts. **Ensure you have BigQuery configured (`BIGQUERY_TABLE_ID`) for persistent travel logs and metrics reporting!**
