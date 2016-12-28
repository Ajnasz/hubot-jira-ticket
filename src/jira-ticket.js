// Description:
//   A hubot script to find and display jira issue links and it's title
//   Set HUBOT_JIRA_HOST to the project prefix, list more than once by separating them by space or comma
//
// Author:
//   Lajos Koszti <koszti.lajos@ustream.tv>
//
// Configuration:
//   HUBOT_JIRA_HOST
//   HUBOT_JIRA_PORT
//   HUBOT_JIRA_USER
//   HUBOT_JIRA_PASSWORD
//   HUBOT_JIRA_PROJECTS

const url = require('url');
const has = require('object-has');

const JiraApi = require('jira').JiraApi;
const config = Object.freeze({
	host: process.env.HUBOT_JIRA_HOST,
	port: process.env.HUBOT_JIRA_PORT || 443,
	user: process.env.HUBOT_JIRA_USER,
	password: process.env.HUBOT_JIRA_PASSWORD
});

const ISSUE_NOT_FOUND = 'Invalid issue number.';

const projects = (process.env.HUBOT_JIRA_PROJECTS || '').split(/[ ,]/g)
	.map(project => project.trim())
	.filter(project => project !== '');

const jira = new JiraApi('https', config.host, config.port, config.user, config.password, '2');
const regexp = new RegExp('(?:^|\\s)((?:' + projects.join('|') + ')-\\d+)\\b', 'g');

function getUrlForTicket (ticket) {
	return url.format({
		protocol: 'https:',
		host: config.host,
		pathname: `/browse/${ticket}`
	});
}

function findIssue (ticket) {
	return new Promise(function (resolve, reject) {
		jira.findIssue(ticket, function (err, issue) {
			if (err) {
				reject(err);
				return;
			}

			resolve(issue);
		});
	});
}

function send (robot, res, issue) {
	const ticketURL = getUrlForTicket(issue.key);
	if (has(robot, 'adapter.client.chat.postMessage')) {
		robot.adapter.client.chat.postMessage(res.user.room, '', {
			attachments: [
				{
					title: issue.fields.summary,
					/* eslint-disable camelcase */
					title_link: ticketURL,
					/* eslint-enable camelcase */
					text: issue.fields.description
				}
			]
		});
	} else {
		res.send(`${ticketURL} ${issue.fields.summary}`);
	}
}

module.exports = function (robot) {
	robot.hear(regexp, function (res) {
		res.match
			.map(s => s.trim())
			.forEach(function (ticket) {
				findIssue(ticket)
					.then((issue) => {
						send(robot, res, issue);
					}).catch(err => {
						robot.logger.debug(`${ticket} - ${err}`);

						if (err === ISSUE_NOT_FOUND) {
							res.send(`${ticket} not found`);
						} else {
							const ticketURL = getUrlForTicket(ticket);
							res.send(`${ticket} ${ticketURL}`);
						}
					});
			});
	});
};
