# MegaLift Heavy Movers website

A responsive website project based on the supplied six-page brochure. It includes a quote estimator, simulated tracking examples and a Node.js enquiry service that appends submissions to an Excel-ready CSV file.

## Run locally

Install Node.js 18 or later, open a terminal in this folder, and start the site:

```bash
node server.mjs
```

Then open `http://localhost:3000`. No package installation or build step is required. The form works through the Node server; opening `index.html` directly will not save enquiries.

## Where enquiries go

Each valid enquiry is appended to `data/inquiries.csv` on the server. The file uses UTF-8 with a spreadsheet-friendly header and is compatible with Microsoft Excel. It includes the contact and cargo brief, quote inputs and indicative estimate, consent, a unique submission reference, and a UTC timestamp. Spreadsheet formula-like values are escaped before they are written.

The CSV is deliberately excluded from public website paths. To enable a protected download, configure an administrator key before starting the server.

PowerShell:

```powershell
$env:MEGALIFT_ADMIN_KEY = 'replace-with-a-long-random-secret'
node server.mjs
```

Download the current log from an authenticated PowerShell session:

```powershell
$headers = @{ Authorization = "Bearer $env:MEGALIFT_ADMIN_KEY" }
Invoke-WebRequest -Uri 'http://localhost:3000/api/inquiries.csv' -Headers $headers -OutFile '.\megalift-inquiries.csv'
```

Open the downloaded CSV in Excel. Keep the admin key private, use HTTPS in production, restrict access to the server and its data folder, and back up the inquiry log. The server stores enquiries on its own disk; use a host with persistent disk storage or connect a database/CRM before production use.

## Share the website

### GitHub Pages: share the visual website only

GitHub Pages publishes the HTML, CSS, images and browser interactions. It does not run `server.mjs`, so the enquiry form will not save submissions from a Pages-only deployment. Use this option if you only want friends to view the site.

1. Create a GitHub repository. For a GitHub Free account, make it public to use Pages.
2. Upload the **contents of this website folder** to the repository root. `index.html` should be visible at the top level.
3. Open the repository's **Settings → Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose branch `main` and folder `/(root)`, then save.
6. When GitHub shows the published address, share that `https://<username>.github.io/<repository>/` link.

GitHub notes that Pages sites are public on the internet, including Pages for private repositories where the plan allows private Pages. Do not commit `data/inquiries.csv`, `.env`, passwords or enquiry records.

### Render: share the site and collect enquiries

Render can run the included Node server. To keep enquiry CSV data through restarts and redeployments, attach a persistent disk; Render's disks are available to paid web services, and files outside the mounted folder are temporary.

1. Create a GitHub repository and upload the contents of this website folder to its root. Confirm that `package.json`, `server.mjs` and `index.html` are at the top level.
2. In Render, choose **New → Web Service** and connect that repository.
3. Set the runtime to **Node**. Use build command `npm install` and start command `npm start`.
4. In the service's environment settings, add `DATA_DIR` with value `/var/data`. Add `MEGALIFT_ADMIN_KEY` with a long random secret. Keep the secret out of GitHub and don't share it with site visitors.
5. In the service's disk settings, add a persistent disk mounted at `/var/data`. Choose the smallest disk size Render currently allows for your service.
6. Deploy. Render provides an `https://...onrender.com` address to share. Open its `/contact.html` page to use the enquiry form.
7. Download the Excel-compatible enquiry log from an authenticated PowerShell session:

```powershell
$env:MEGALIFT_ADMIN_KEY = 'your-secret-key'
$headers = @{ Authorization = "Bearer $env:MEGALIFT_ADMIN_KEY" }
Invoke-WebRequest -Uri 'https://YOUR-SERVICE.onrender.com/api/inquiries.csv' -Headers $headers -OutFile '.\megalift-inquiries.csv'
```

Replace `YOUR-SERVICE` with the service name Render assigns. Open the downloaded CSV in Excel. Render's persistent disk retains files only under its mount path, which is why `DATA_DIR` and the disk mount must both be `/var/data`.

For GitHub Pages publishing details, see [GitHub's Pages publishing guide](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site). For Render's Node service and persistent disk settings, see [Render web services](https://render.com/docs/web-services) and [Render persistent disks](https://render.com/docs/disks).

Google Fonts and the equipment-gallery photos load from their source sites when the browser is online; system fonts are used as a fallback. Photo credits link back to their Unsplash pages.

## Content status

- Package ranges match the brochure and are labeled indicative, proposed and excluding GST. They are used for a quick estimate only; final scope needs review.
- The shipment profiles and tracking cases are labeled illustrative. No verified past shipment records or live GPS feed were supplied. Replace the sample profiles with approved records and connect an actual tracking provider before presenting them as historical or live.
- Equipment photos are real stock photographs and do not depict MegaLift-owned equipment. Fleet counts shown on the Services page are user-provided: 30 heavy tractor units, 20 modular trailers/low loaders, 15 cranes/lifting systems, and 40 loaders/support machines. Confirm owned, leased or partner status and the inventory date before publishing figures.
- The corridor diagram, locations and route examples are not route surveys. Confirm each route, hub and service availability before promising it.
- No phone number, email address, client name, logo, testimonial, certification or verified performance result has been invented.
- Service guarantees, response times, fleet targets, coverage, hub availability and the MegaLift Track interface remain proposals that require operational and legal review before being offered.
