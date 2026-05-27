import { Studio } from 'sanity';
import config from '../../sanity.config.js';

export default function SanityStudio() {
  return <Studio config={config} />;
}
