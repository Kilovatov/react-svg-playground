import React, {Component} from 'react';
import PropTypes from 'prop-types';
import { getCanvasPosition } from './utils/formulas';
import Canvas from './components/Canvas';
import Auth0Web from 'auth0-web';
import io from 'socket.io-client';

const auth0Client = new Auth0Web({
    domain: 'kss.auth0.com',
    clientID: '72Bjd1w7xL7ZBfM64n6n7bp4k2Ul9WVR',
    redirectUri: 'https://pacific-retreat-52110.herokuapp.com/',
    audience: 'https://kilovatov.github.io/react-svg-game/',
    responseType: 'token id_token',
    scope: 'openid profile manage:points',
});


class App extends Component {
    constructor(props) {
        super(props);
        this.socket = null;
        this.currentPlayer = null;
    }

    componentDidMount() {

        auth0Client.parseHash();

        auth0Client.subscribe((auth) => {
            if (!auth) return;
            this.playerProfile = auth0Client.getProfile();
            this.currentPlayer = {
                id: this.playerProfile.sub,
                maxScore: 0,
                name: this.playerProfile.name,
                picture: this.playerProfile.picture,
            };
            this.props.loggedIn(this.currentPlayer);

            this.socket = io('http://localhost:3001', {
                query: `token=${auth0Client.getAccessToken()}`,
            });

            this.socket.on('players', (players) => {
                this.props.leaderboardLoaded(players);
                players.forEach((player) => {
                    if (player.id === this.currentPlayer.id) {
                        this.currentPlayer.maxScore = player.maxScore;
                    }
                });
            });
        });

        setInterval(() => {
            this.props.moveObjects(this.canvasMousePosition);
        }, 10);
        window.onresize = () => {
            const cnv = document.getElementById('aliens-go-home-canvas');
            cnv.style.width = `${window.innerWidth}px`;
            cnv.style.height = `${window.innerHeight}px`;
        };
        window.onresize();
    }

    componentWillReceiveProps(nextProps) {
        if (!nextProps.gameState.started && this.props.gameState.started) {
            if (this.currentPlayer.maxScore < this.props.gameState.kills) {
                this.socket.emit('new-max-score', {
                    ...this.currentPlayer,
                    maxScore: this.props.gameState.kills,
                });
            }
        }
    }

    shoot = () => {
        this.props.shoot(this.canvasMousePosition);
    };

    trackMouse(event) {
        this.canvasMousePosition = getCanvasPosition(event);
    }

    render() {
        return (
            <Canvas
                angle={this.props.angle}
                gameState={this.props.gameState}
                startGame={this.props.startGame}
                trackMouse={event => (this.trackMouse(event))}
                currentPlayer={this.props.currentPlayer}
                players={this.props.players}
                authClient={auth0Client}
                shoot={this.shoot}
            />
        );
    }
}

App.propTypes = {
    angle: PropTypes.number.isRequired,
    gameState: PropTypes.shape({
        started: PropTypes.bool.isRequired,
        kills: PropTypes.number.isRequired,
        lives: PropTypes.number.isRequired,
        flyingObjects: PropTypes.arrayOf(PropTypes.shape({
            position: PropTypes.shape({
                x: PropTypes.number.isRequired,
                y: PropTypes.number.isRequired
            }).isRequired,
            id: PropTypes.number.isRequired,
        })).isRequired,
    }).isRequired,
    moveObjects: PropTypes.func.isRequired,
    startGame: PropTypes.func.isRequired,
    currentPlayer: PropTypes.shape({
        id: PropTypes.string.isRequired,
        maxScore: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        picture: PropTypes.string.isRequired,
    }),
    leaderboardLoaded: PropTypes.func.isRequired,
    loggedIn: PropTypes.func.isRequired,
    players: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        maxScore: PropTypes.number.isRequired,
        name: PropTypes.string.isRequired,
        picture: PropTypes.string.isRequired,
    })),
    shoot: PropTypes.func.isRequired,
};

App.defaultProps = {
    currentPlayer: null,
    players: null,
};

export default App;