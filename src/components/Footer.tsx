import { Component } from 'react';

// Named imports let Vite tree-shake package.json instead of bundling all of it
import { version, repository } from '../../package.json';

export default class Footer extends Component {
  render() {
    return (
      <footer className="text-center m-12 text-gray-700 font-mono mt-auto pt-4 no-print">
        <span>v{version}</span>
        <span> – </span>
        <a className="font-bold" href={repository.url} rel="noopener noreferrer" target="_blank">
          GitHub
        </a>
      </footer>
    );
  }
}
