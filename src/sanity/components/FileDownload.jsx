function getFileUrl(value) {
  const ref = value?.asset?._ref;
  if (!ref) return null;
  // file-XXXXXXXXXXXXXXXX-pdf → https://cdn.sanity.io/files/projectId/dataset/XXXXX.pdf
  const clean = ref.replace('file-', '');
  const lastDash = clean.lastIndexOf('-');
  if (lastDash === -1) return null;
  const id  = clean.slice(0, lastDash);
  const ext = clean.slice(lastDash + 1);
  return `https://cdn.sanity.io/files/8q7vz6co/production/${id}.${ext}`;
}

export function FileDownloadInput(props) {
  const { value, renderDefault } = props;
  const url = getFileUrl(value);

  return (
    <div>
      {renderDefault(props)}
      {url && (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          download
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            marginTop: '8px',
            padding: '6px 16px',
            background: '#1a5c2a',
            color: 'white',
            borderRadius: '4px',
            textDecoration: 'none',
            fontSize: '13px',
            fontWeight: 600,
          }}
        >
          ⬇ Descargar archivo
        </a>
      )}
    </div>
  );
}
