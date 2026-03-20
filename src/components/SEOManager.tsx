import { Helmet } from 'react-helmet-async';
import React from 'react';

export const SEOManager = ({ title, description, schema }: { title: string, description: string, schema: any }) => (
  <Helmet>
    <title>{title}</title>
    <meta name="description" content={description} />
    <script type="application/ld+json">
      {JSON.stringify(schema)}
    </script>
  </Helmet>
);

export const homeSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "RawDrive",
  "applicationCategory": "PhotographyDelivery",
  "description": "Spatial rendering and lossless compression for professional photographers.",
  "offers": { "@type": "Offer", "priceCurrency": "INR", "price": "24.00" }
};
