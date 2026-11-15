import { Component } from 'react';

import Context, {
  initialContext,
  type AppContext,
  type AppState,
  type SetContext
} from './context';

import Header from './components/Header';
import Intro from './components/Intro';
import Print from './components/Print';
import Footer from './components/Footer';

import ErrorIcon from './assets/exclamation-circle.svg?react';
import { folderOptions, parseJson } from './vault';

import './index.css';

export default class App extends Component<object, AppContext> {
  // Must be declared before `state`, which references it
  setContext: SetContext = (newContext, callback) => {
    // setState merges, so only the changed keys are needed
    this.setState(newContext as AppState, callback);
  };

  state: AppContext = { ...initialContext, setContext: this.setContext };

  demoData = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}demo.json`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      // Same validation as an imported file
      const text = await response.text();
      const data = parseJson(text);
      const foldersToPrint = folderOptions(data).map(({ id }) => id);

      const file = {
        name: 'demo.json',
        lastModified: 1576401686010,
        size: new Blob([text]).size
      };

      this.setState({ data, file, foldersToPrint, error: null });
    } catch {
      this.setState({ error: 'The demo vault could not be loaded.' });
    }
  };

  componentDidMount() {
    if (new URLSearchParams(window.location.search).has('demo')) {
      this.demoData();
    }
  }

  render() {
    return (
      <Context value={this.state}>
        <main className="leading-relaxed min-h-screen flex flex-col">
          <Header />
          {this.state.error && (
            <div className="container mt-4 md:mt-8 w-full print:hidden" role="alert">
              <p className="flex items-center bg-red-100 border border-red-400 text-red-800 rounded-sm px-4 py-3">
                <ErrorIcon className="h-4 w-4 mr-2 shrink-0" />
                <span>{this.state.error}</span>
              </p>
            </div>
          )}
          <Intro />
          <Print />
          <Footer />
        </main>
      </Context>
    );
  }
}
