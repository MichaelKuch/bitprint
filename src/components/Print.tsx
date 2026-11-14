import { Component, type ContextType } from 'react';
import classNames from 'classnames';
import { QRCodeSVG } from 'qrcode.react';

import Context, { type Login } from '../context';

import FrownOpenIcon from '../assets/frown-open.svg?react';
import PrintIcon from '../assets/print.svg?react';

import Logo from './Logo';

export default class Print extends Component {
  static contextType = Context;
  declare context: ContextType<typeof Context>;

  formatDate() {
    // lastModified is missing on some sources (e.g. the demo file before it is set)
    const date = new Date(this.context.file.lastModified ?? Date.now());
    return date.toLocaleDateString() + ' – ' + date.toLocaleTimeString();
  }

  getHostName = (login: Login): string | false => {
    try {
      const hostname = new URL(login.uris![0].uri).hostname;
      const parts = hostname.split('.');
      return parts[parts.length - 2] + '.' + parts[parts.length - 1];
    } catch {
      return false;
    }
  };

  // Folder filtering applies as soon as the vault has folders
  hasFolderFilter = () => {
    const { data, foldersToPrint } = this.context;
    return foldersToPrint.length > 0 || data.folders.length > 0;
  };

  getPrintItemLength = () => {
    const { data, foldersToPrint } = this.context;

    if (this.hasFolderFilter()) {
      return data.items.filter(item => item.folderId && foldersToPrint.includes(item.folderId))
        .length;
    }
    return data.items.length;
  };

  render() {
    const { dataToPrint, foldersToPrint, data } = this.context;
    const dataToPrintKeys = Object.keys(dataToPrint);
    const filterByFolder = this.hasFolderFilter();

    return (
      <div>
        {data.items.length > 0 && (
          <div className="container my-8 text-gray-700">
            <div className="px-4 print-fix">
              <div className="flex justify-between items-baseline">
                <h1
                  spellCheck="false"
                  suppressContentEditableWarning={true}
                  onKeyDown={event => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      event.currentTarget.blur();
                    }
                  }}
                  contentEditable="true"
                  className="focus:ring focus:border-transparent outline-hidden px-1 -ml-1 rounded-sm min-w-full font-bold text-2xl text-gray-900 border-b border-blue-500 border-dashed hover:bg-gray-400 whitespace-nowrap flex"
                  style={{ minWidth: '185px' }}
                  title="Edit title"
                >
                  Bitwarden Vault
                </h1>
                <span>
                  Logins <strong>({this.getPrintItemLength()})</strong>
                </span>
              </div>
              <div className="flex justify-between items-baseline">
                <span>{this.formatDate()}</span>
                <span>
                  <span className="comma-list">
                    <span>Names</span>
                    {dataToPrintKeys.map(
                      option =>
                        dataToPrint[option] && (
                          <span className="inline-block capitalize" key={option}>
                            {option}
                          </span>
                        )
                    )}
                  </span>
                </span>
              </div>
            </div>
            <div className="fixed bottom-0 right-0 w-full no-print pointer-events-none">
              <div className="container flex">
                <span className="ml-auto inline-flex p-4 md:p-8 slide-in-bottom">
                  <button
                    className="btn -rounded -lg -active shadow-md flex items-center"
                    onClick={() => window.print()}
                    style={{ pointerEvents: 'all' }}
                  >
                    <PrintIcon className="h-4 mr-2" /> Print
                  </button>
                </span>
              </div>
            </div>
            <ul className="leading-snug">
              {foldersToPrint.length === 0 && data.folders.length !== 0 && (
                <li className="text-center py-40 text-sm text-gray-500">
                  <FrownOpenIcon className="h-4 mx-auto mb-2" />
                  <div>Nothing to see here.</div>
                </li>
              )}
              {data.items.map((item, index) => {
                const { fields, folderId, login, name, notes, type } = item;

                if (type !== 1) return null;
                if (filterByFolder && !(folderId && foldersToPrint.includes(folderId))) {
                  return null;
                }

                return (
                  <li
                    className="bg-white border border-gray-400 rounded-sm mt-4 wrap-break-word shadow-md"
                    key={index}
                  >
                    <div className="px-4 py-2 font-bold flex items-center">
                      {dataToPrint['logos'] && login?.uris && (
                        <Logo
                          key={this.getHostName(login) || name}
                          alt={name}
                          className="inline-block mr-2 h-5 w-5 text-blue-500"
                          src={`https://icons.bitwarden.net/${this.getHostName(login)}/icon.png`}
                        />
                      )}
                      <span>{name}</span>
                    </div>
                    {login && (
                      <div className="font-mono item-wrapper">
                        <div className="item-data">
                          {login.username && (
                            <div
                              className={classNames({
                                hidden: !dataToPrint['username'],
                                'px-4 py-2 border-t border-gray-400': true
                              })}
                            >
                              <span className="text-gray-500">U – </span>
                              <span>{login.username}</span>
                            </div>
                          )}
                          {login.password && (
                            <div
                              className={classNames({
                                hidden: !dataToPrint['password'],
                                'px-4 py-2 border-t border-gray-400': true
                              })}
                            >
                              <span className="text-gray-500">P – </span>
                              <span>{login.password}</span>
                            </div>
                          )}
                          {login.totp && (
                            <div
                              className={classNames({
                                hidden: !dataToPrint['totp'],
                                'px-4 py-2 border-t border-gray-400': true
                              })}
                            >
                              <span className="text-gray-500">T – </span>
                              <span>{login.totp}</span>
                            </div>
                          )}
                          {login.uris &&
                            login.uris.map((url, uriIndex) => (
                              <div
                                className={classNames({
                                  hidden: !dataToPrint['uris'],
                                  'px-4 py-2 border-t border-gray-400': true
                                })}
                                key={uriIndex}
                              >
                                <span className="text-gray-500">{url.uri}</span>
                              </div>
                            ))}
                          {notes && (
                            <div
                              className={classNames({
                                hidden: !dataToPrint['notes'],
                                'px-4 py-2 border-t border-gray-400': true
                              })}
                            >
                              <span className="text-gray-500">N – </span>
                              <span>{notes}</span>
                            </div>
                          )}
                          {fields &&
                            fields.map((field, fieldIndex) => (
                              <div
                                className={classNames({
                                  hidden: !dataToPrint['fields'],
                                  'px-4 py-2 border-t border-gray-400': true
                                })}
                                key={fieldIndex}
                              >
                                <span className="text-gray-500">
                                  {field.name && field.name + ' – '}
                                </span>
                                <span>{field.value}</span>
                              </div>
                            ))}
                        </div>
                        <div className={classNames('item-qr', { hidden: !dataToPrint['qrcodes'] })}>
                          <QRCodeSVG value={JSON.stringify(item)} size={150} />
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    );
  }
}
