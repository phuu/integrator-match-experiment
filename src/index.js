require('babel/polyfill');

import Server from 'leadfoot/Server';

var server = new Server('http://localhost:4444/wd/hub');

var callOnArg = (k, ...args) =>
                (elem, ...innerArgs) =>
                elem[k].apply(elem, args.concat(innerArgs));

var children = (elem, recurse) =>
    (recurse
        ? elem.getProperty('children')
            .then(children => {
                return Promise.all(children.map(collect({ recurse: true })));
            })
        : Promise.resolve());

const get = (map, k) => map.find(([mk, v]) => mk === k)[1];

var queries = [
    [ 'tagName',          callOnArg('getTagName')                             ],
    [ 'color',            callOnArg('getComputedStyle', 'color' )             ],
    [ 'background-color', callOnArg('getComputedStyle', 'background-color' )  ],
    [ 'position',         callOnArg('getPosition')                            ],
    [ 'size',             callOnArg('getSize')                                ],
    [ 'enabled',          callOnArg('isEnabled')                              ],
    [ 'displayed',        callOnArg('isDisplayed')                            ],
    [ 'id-attr',          callOnArg('getAttribute', 'id' )                    ],
    [ 'class-attr',       callOnArg('getAttribute', 'class' )                 ],
    [ 'id',               callOnArg('getProperty', 'id' )                     ],
    [ 'className',        callOnArg('getProperty', 'className' )              ],
    [ 'dataSet',          callOnArg('getProperty', 'dataset' )                ],
    [ 'classList',        callOnArg('getProperty', 'classList' )              ],
    [ 'outerHTML',        callOnArg('getProperty', 'outerHTML' )              ],
    [ 'innerHTML',        callOnArg('getProperty', 'innerHTML' )              ],
    [ 'textContent',      callOnArg('getProperty', 'textContent' )            ],
    [ 'children', children ],
    [ 'parent',
      (elem, recurse) =>
        (recurse && elem
            ? elem.getProperty('parentNode')
                .then(collect({ recurse: false }))
            : Promise.resolve()) ]
];

const collect = ({ recurse }) => elem => {
    if (!elem) {
        return [];
    }
    return Promise.all(
        queries.reduce(
            (ps, [ name, f ]) =>
                ps.concat([
                    f(elem, recurse).then(v => [name, v])
                ]),
            []
        )
    );
};

server.createSession({ browserName: 'chrome' })
    .then(session => {
        return session.get('http://localhost:8001')
            .then(() => session.findByCssSelector('#the-div'))
            .then(collect({ recurse: true }))
            .then(result => {
                console.log(require('util').inspect(result, { depth: null, colors: true }));
            })
            .catch(why => {
                console.error(why.stack)
            })
            .then(() => session.quit());

        process.on('SIGINT', () => session.quit());
    });
