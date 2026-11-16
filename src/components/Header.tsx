import {
  Component,
  Fragment,
  createRef,
  type ChangeEvent,
  type ContextType,
  type FormEvent
} from 'react';
import classNames from 'classnames';

import Context, { initialContext } from '../context';
import type { VaultData } from '../context';
import type { PasswordProtectedExport } from '../crypto';
import {
  folderOptions,
  PasswordRequiredError,
  readVault,
  unlockVault,
  VaultImportError
} from '../vault';

import FileImportIcon from '../assets/file-import.svg?react';
import PrintIcon from '../assets/print.svg?react';
import ArrowLogo from '../assets/arrow.svg?react';
import TrashIcon from '../assets/trash.svg?react';

interface HeaderState {
  /** A password protected export that is waiting for its password */
  locked: { file: File; doc: PasswordProtectedExport } | null;
  decrypting: boolean;
}

export default class Header extends Component<object, HeaderState> {
  static contextType = Context;
  declare context: ContextType<typeof Context>;

  state: HeaderState = { locked: null, decrypting: false };

  fileInput = createRef<HTMLInputElement>();
  passwordInput = createRef<HTMLInputElement>();

  toggleFolder = (id: string) => {
    const foldersToPrint = [...this.context.foldersToPrint];
    const index = foldersToPrint.indexOf(id);

    if (index === -1) {
      foldersToPrint.push(id);
    } else {
      foldersToPrint.splice(index, 1);
    }

    this.context.setContext({ foldersToPrint });
  };

  readFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    if (!file) return;

    try {
      this.showVault(await readVault(file), file);
    } catch (error) {
      if (error instanceof PasswordRequiredError) {
        this.setState({ locked: { file, doc: error.doc } });
        this.context.setContext({ error: null });
        return;
      }

      // Lets the same file be picked again after it has been fixed
      input.value = '';
      this.showError(error);
    }
  };

  showVault(data: VaultData, file: File) {
    const foldersToPrint = folderOptions(data).map(({ id }) => id);
    this.context.setContext({ data, file, foldersToPrint, error: null });
  }

  showError(error: unknown) {
    this.context.setContext({
      error: error instanceof VaultImportError ? error.message : 'The file could not be read.'
    });
  }

  unlock = async (event: FormEvent) => {
    event.preventDefault();

    const { locked, decrypting } = this.state;
    const input = this.passwordInput.current;
    if (!locked || decrypting || !input || input.value === '') return;

    // The password is only ever held in the input and in this call
    const password = input.value;
    this.setState({ decrypting: true });
    this.context.setContext({ error: null });

    try {
      const data = await unlockVault(locked.doc, password);
      if (this.state.locked !== locked) return; // cancelled in the meantime

      this.setState({ locked: null, decrypting: false });
      this.showVault(data, locked.file);
    } catch (error) {
      if (this.state.locked !== locked) return;

      this.setState({ decrypting: false }, () => {
        // Still mounted: the prompt stays open for another try
        this.passwordInput.current?.select();
      });
      this.showError(error);
    }
  };

  cancelUnlock = () => {
    this.setState({ locked: null, decrypting: false });
    this.context.setContext({ error: null });
  };

  resetState = () => {
    if (this.fileInput.current) this.fileInput.current.value = '';
    this.setState({ locked: null, decrypting: false });
    // Drops `?demo`. The pathname rather than BASE_URL, so it also works from file://
    window.history.pushState(null, '', window.location.pathname);
    this.context.setContext({ ...initialContext });
  };

  toggleDataOption = (option: string) => {
    const dataToPrint = { ...this.context.dataToPrint };
    dataToPrint[option] = !dataToPrint[option];
    this.context.setContext({ dataToPrint });
  };

  render() {
    const { dataToPrint, foldersToPrint, data, file } = this.context;
    const { locked, decrypting } = this.state;
    const dataToPrintKeys = Object.keys(dataToPrint);
    const folders = folderOptions(data);

    return (
      <div className="app-header bg-gray-900 print:hidden text-white py-6 xl:h-24">
        <div className="container relative h-full flex items-center w-full">
          <div
            className={classNames({
              hidden: file.size !== 0,
              'flex justify-between items-center flex-col md:flex-row w-full': file.size == 0
            })}
          >
            <h1 className="font-light text-2xl md:text-3xl mb-4 md:-mb-2 -m-1 flex items-center">
              <PrintIcon className="h-6 mr-2 text-blue-500" />
              <span>BitPrint</span>
            </h1>
            {locked ? (
              <form
                className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4"
                onSubmit={this.unlock}
              >
                <div className="flex flex-col md:flex-row md:items-center md:gap-3">
                  <label className="label md:mb-0" htmlFor="export-password">
                    Password for {locked.file.name}
                  </label>
                  <input
                    autoComplete="off"
                    autoFocus
                    className="rounded-sm bg-white text-gray-900 px-3 py-1.5 text-sm outline-hidden focus:ring-3 focus:ring-blue-500"
                    disabled={decrypting}
                    id="export-password"
                    ref={this.passwordInput}
                    required
                    type="password"
                  />
                </div>
                <div className="flex gap-2">
                  <button className="btn -active" disabled={decrypting} type="submit">
                    {decrypting ? 'Decrypting…' : 'Decrypt'}
                  </button>
                  <button className="btn" onClick={this.cancelUnlock} type="button">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center font-bold uppercase">
                <span className="flex items-center mr-4 slide-in-left text-xs">
                  Click to start <ArrowLogo className="ml-2 h-5" />
                </span>
                <div className="relative btn -active">
                  <span className="flex items-center">
                    <FileImportIcon className="h-4 mr-2" />
                    <span className="text-xs">Import Vault</span>
                  </span>
                  <input
                    className="opacity-0 absolute h-full w-full inset-0"
                    accept=".json,.csv,application/json,text/csv"
                    onChange={this.readFile}
                    ref={this.fileInput}
                    type="file"
                  />
                </div>
              </div>
            )}
          </div>
          {data.items.length > 0 && (
            <div className="flex flex-col xl:flex-row -mt-2 w-full">
              <div className="flex flex-col lg:flex-row flex-1">
                {folders.length > 0 && (
                  <div className="xl:mt-auto">
                    <label className="label">Folders</label>
                    <ul className="flex flex-wrap -mx-2">
                      {folders.map(({ id, name }) => (
                        <li
                          className={classNames({
                            'relative mb-4 flex-1 px-2 lg:mb-0': true,
                            '-active': foldersToPrint.includes(id)
                          })}
                          key={id}
                        >
                          <input
                            checked={foldersToPrint.includes(id)}
                            className="peer sr-only"
                            id={`folder-${id}`}
                            onChange={() => this.toggleFolder(id)}
                            type="checkbox"
                          />
                          <label
                            className="btn w-full peer-focus-visible:ring-3 peer-focus-visible:ring-blue-300"
                            htmlFor={`folder-${id}`}
                            title={
                              (foldersToPrint.includes(id) ? 'Hide ' : 'Show ') +
                              name.charAt(0).toUpperCase() +
                              name.slice(1)
                            }
                          >
                            {name}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div
                  className={classNames({
                    'lg:mt-auto flex-1 lg:pl-8 xl:px-8': true,
                    'lg:-ml-8': folders.length === 0
                  })}
                >
                  <label className="label">Data</label>
                  <ul className="flex flex-wrap -mx-2">
                    {dataToPrintKeys.map(option => (
                      <li
                        className={classNames({
                          'relative mb-4 flex-1 px-2 lg:mb-0': true,
                          '-active': dataToPrint[option]
                        })}
                        key={option}
                      >
                        <input
                          checked={dataToPrint[option]}
                          className="peer sr-only"
                          id={`data-${option}`}
                          onChange={() => this.toggleDataOption(option)}
                          type="checkbox"
                        />
                        <label
                          className="btn w-full peer-focus-visible:ring-3 peer-focus-visible:ring-blue-300"
                          htmlFor={`data-${option}`}
                          title={
                            (dataToPrint[option] ? 'Hide ' : 'Show ') +
                            option.charAt(0).toUpperCase() +
                            option.slice(1)
                          }
                        >
                          {option}
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="xl:ml-auto xl:mt-auto flex flex-col lg:mt-4">
                {file.name && (
                  <Fragment>
                    {file.size > 0 && <label className="label">Vault</label>}
                    <div className="flex">
                      <span
                        className="font-bold uppercase text-xs btn mr-4 w-full"
                        style={{ cursor: 'not-allowed' }}
                      >
                        {`${file.name} (${(file.size / 1000).toFixed(1)} kB)`}
                      </span>
                      <button
                        className="btn warning"
                        onClick={this.resetState}
                        title="Trash and start over"
                      >
                        <TrashIcon className="h-4" />
                      </button>
                    </div>
                  </Fragment>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
}
