# Google Analytics and Search Console Setup

Add these environment variables in Vercel under Project Settings > Environment Variables:

```bash
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=google-verification-token
NEXT_PUBLIC_BING_SITE_VERIFICATION=bing-verification-token
```

`NEXT_PUBLIC_GA_MEASUREMENT_ID` enables Google Analytics 4. Leave it empty to disable GA loading.

`NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` renders the Google Search Console verification meta tag. Leave it empty if you verify with DNS instead.

`NEXT_PUBLIC_BING_SITE_VERIFICATION` renders the optional Bing Webmaster verification meta tag. Leave it empty if Bing verification is not needed.

After adding or changing these variables in Vercel, redeploy the site so the public environment variables are included in the build.

After deployment, submit this sitemap in Google Search Console:

```text
https://www.uniblex.com/sitemap.xml
```
