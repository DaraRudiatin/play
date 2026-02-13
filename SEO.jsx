import { useEffect } from 'react';

const SEO = ({ 
  title, 
  description, 
  keywords, 
  ogImage, 
  canonical,
  type = 'website',
  structuredData 
}) => {
  useEffect(() => {
    // Update title
    if (title) {
      document.title = `${title} | TWORUAN`;
    }

    // Update meta description
    if (description) {
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', description);
      }
    }

    // Update meta keywords
    if (keywords) {
      const metaKeywords = document.querySelector('meta[name="keywords"]');
      if (metaKeywords) {
        metaKeywords.setAttribute('content', keywords);
      }
    }

    // Update canonical URL
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]');
      if (!link) {
        link = document.createElement('link');
        link.setAttribute('rel', 'canonical');
        document.head.appendChild(link);
      }
      link.setAttribute('href', canonical);
    }

    // Update Open Graph tags
    const ogTags = [
      { property: 'og:title', content: title || document.title },
      { property: 'og:description', content: description },
      { property: 'og:type', content: type },
      { property: 'og:url', content: canonical || window.location.href },
      { property: 'og:image', content: ogImage || 'https://tworuan.com/og-image.jpg' },
    ];

    ogTags.forEach(({ property, content }) => {
      if (content) {
        let meta = document.querySelector(`meta[property="${property}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('property', property);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      }
    });

    // Update Twitter Card tags
    const twitterTags = [
      { name: 'twitter:title', content: title || document.title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: ogImage || 'https://tworuan.com/og-image.jpg' },
    ];

    twitterTags.forEach(({ name, content }) => {
      if (content) {
        let meta = document.querySelector(`meta[name="${name}"]`);
        if (!meta) {
          meta = document.createElement('meta');
          meta.setAttribute('name', name);
          document.head.appendChild(meta);
        }
        meta.setAttribute('content', content);
      }
    });

    // Add structured data
    if (structuredData) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.text = JSON.stringify(structuredData);
      script.id = 'structured-data';
      
      // Remove old structured data if exists
      const oldScript = document.getElementById('structured-data');
      if (oldScript) {
        oldScript.remove();
      }
      
      document.head.appendChild(script);

      return () => {
        script.remove();
      };
    }
  }, [title, description, keywords, ogImage, canonical, type, structuredData]);

  return null;
};

export default SEO;
