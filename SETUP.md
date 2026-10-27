# Nope & Hope: setup guide

The website works as soon as it's on GitHub Pages. Until you connect Supabase (Part 2), sign-in and scam reports are saved only in each visitor's own browser.

## Part 1: Put the site on GitHub Pages

1. Sign in at github.com and click **New repository**. Name it `nopeandhope`, set it to **Public**, and click **Create repository**.
2. On the new repository page, click **uploading an existing file**.
3. Unzip the site folder on your computer. Select everything inside it (not the folder itself) and drag it into the upload area. Click **Commit changes**.
4. Go to **Settings → Pages**. Under **Build and deployment**, set Source to **Deploy from a branch**, Branch to **main**, folder to **/ (root)**. Click **Save**.
5. Wait 1–2 minutes and refresh. Your site's address appears at the top, like `https://YOUR-USERNAME.github.io/nopeandhope/`.

To change a file later: open it on GitHub, click the pencil icon, edit, and **Commit changes**. The site updates in about a minute.

## Part 1b: Connect nopeandhope.com

The site folder already includes a file called `CNAME` containing `nopeandhope.com`. Keep it in the repository.

1. In your domain provider's DNS settings, delete any existing "parking" A or CNAME records for `@` and `www`, then add:

   | Type | Name / Host | Value |
   | --- | --- | --- |
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | CNAME | www | YOUR-USERNAME.github.io |

2. On GitHub, go to **Settings → Pages → Custom domain**, type `nopeandhope.com` and click **Save**.
3. DNS can take from a few minutes to 24 hours. When GitHub shows "DNS check successful", tick **Enforce HTTPS**.
4. In Supabase, change **Authentication → URL Configuration → Site URL** to `https://nopeandhope.com`, and add it to **Redirect URLs**.

## Part 2: Turn on real sign-in, scam reports and the contact form (Supabase, free)

### 2a. Create the project
1. Go to supabase.com, sign up, and click **New project**.
2. Name it `nopeandhope`, set a strong database password (save it somewhere safe), and choose the region **Mumbai (ap-south-1)**.
3. Wait about 2 minutes for it to finish setting up.

### 2b. Create the tables
1. In the left menu, open **SQL Editor → New query**.
2. Open `supabase-setup.sql` from the site folder, copy all of it, paste it in, and click **Run**. It should say "Success".

### 2c. Set up email sign-in
1. Go to **Authentication → Sign In / Providers** and make sure **Email** is turned on.
2. Go to **Authentication → URL Configuration**:
   - **Site URL:** your GitHub Pages address from Part 1.
   - **Redirect URLs:** add the same address.
3. Go to **Authentication → Emails → Templates**. In both **Magic Link** and **Confirm signup**, replace the body with:

   ```
   <h2>Your Nope & Hope code</h2>
   <p>Enter this code to sign in: <strong>{{ .Token }}</strong></p>
   <p>It expires in 1 hour. If you didn't ask for it, ignore this email.</p>
   ```

   Save each one. This makes the email show a 6-digit code, which is what the website asks for.

### 2d. Connect the website to Supabase
1. In Supabase, go to **Project Settings → API**. Copy the **Project URL** and the **anon public** key.
2. On GitHub, open `config.js`, click the pencil icon, and fill them in:

   ```js
   window.NH_CONFIG = {
     supabaseUrl: 'https://xxxxxxxx.supabase.co',
     supabaseAnonKey: 'eyJhbGciOi...'
   };
   ```
3. Click **Commit changes**.

The anon key is meant to be public. The database rules you ran in 2b decide what visitors can do. Never put the **service_role** key in any website file.

### 2e. Test it
1. Open your site, click **Log in**, enter your email, and type in the code you receive.
2. Check a scam message, click **Report a scam sender**, and send a report. The count should show "Reported 1 time".
3. Open **My applications**, add one application, then log in on your phone and check it appears there too.
4. Send yourself a message on the Contact page. Read it in Supabase under **Table Editor → messages**.

## Before you launch publicly

- **Email limits:** Supabase's built-in email sender is only for testing and allows very few emails per hour. Before you share the site widely, connect a free email service under **Authentication → Emails → SMTP Settings** (Brevo and Resend both have free plans).
- **Free plan pausing:** free Supabase projects pause after a week with no activity. Open the site once a week until you have regular visitors.
- **Phone sign-in:** OTP by SMS in India needs DLT registration under TRAI rules. Email codes avoid this; add phone sign-in later.

## Part 3: Payments (later, when the ₹99 report goes live)

1. **Razorpay account:** sign up at razorpay.com with your PAN, bank account and address proof. Give your live site address; the Pricing, Contact, Terms, Privacy, Refunds and Delivery pages are already there.
2. **Move hosting first:** GitHub Pages doesn't allow sites mainly used to sell things or run a paid service. When payments start, move the same files to Netlify or Cloudflare Pages (both free). It takes about 10 minutes and your domain moves with it.
3. **Unlocking reports safely:** use a Razorpay Payment Link or Payment Button for checkout, and a Supabase Edge Function that receives Razorpay's "payment captured" webhook and records the purchase against the user. The website then checks that record before unlocking the full report. This part needs a small amount of server code; ask Claude to build it when you reach this step.
