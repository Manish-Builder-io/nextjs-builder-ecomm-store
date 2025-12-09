import { builder } from "@builder.io/sdk";

// Builder Public API Key set in .env file
builder.init("db60bf3db7fa4db7be81ef05b72bd720");

export default async function Page() {
  try {
    const asset = await builder
      .get('assets', {
        cachebust: true,
        includeUnpublished: true,
        locale: 'de-DE',
        options: {
          enrich: true, 
        },
        query: {
          'data.cid': "ahBfk0xt6ENv99zBtpuynkass",
        },
      })
      .toPromise();
  
    console.log(JSON.stringify(asset, null, 2));

    return (
      <div style={{ padding: '20px', fontFamily: 'monospace' }}>
        <h1>Asset Data</h1>
        <pre style={{ 
          background: '#f5f5f5', 
          padding: '20px', 
          borderRadius: '8px',
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {JSON.stringify(asset, null, 2)}
        </pre>
      </div>
    );
  } catch (error) {
    console.error('Error fetching Builder content:', error);
    return (
      <div style={{ padding: '20px' }}>
        <h1>Error</h1>
        <p>Failed to fetch asset: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }
}
