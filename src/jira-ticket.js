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
const at = require('object-at');

const JiraApi = require('jira').JiraApi;
const config = Object.freeze({
	host: process.env.HUBOT_JIRA_HOST,
	port: process.env.HUBOT_JIRA_PORT || 443,
	user: process.env.HUBOT_JIRA_USER,
	password: process.env.HUBOT_JIRA_PASSWORD
});

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

function send (robot, res, issues) {
	if (has(robot, 'adapter.client.web')) {

		robot.adapter.client.web.chat.postMessage(res.envelope.room || res.envelope.id, '', {
			/* eslint-disable camelcase */
			as_user: true,
			link_names: 1,
			attachments: issues.map(issue => {
				const ticketURL = getUrlForTicket(issue.key);
				const date = new Date(at(issue, 'fields.updated')).getTime();

				return {
					fallback: `${ticketURL} ${at(issue, 'description')}`,
					author: at(issue, 'fields.creator.displayName'),
					author_icon: at(issue, 'fields.creator.avatarUrls["48x48"]'),
					title: `${at(issue, 'key')}${at(issue, 'fields.summary')}`,
					title_link: ticketURL,
					text: issue.fields.description,
					fields: [
						{
							title: 'Status',
							value: at(issue, 'fields.status.name'),
							short: false
						}
					].filter(f => !!f.value),
					footer: at(issue, 'fields.project.name'),
					ts: isNaN(date) ? void(0) : date
				};
			})
			/* eslint-enable camelcase */
		});
	} else {
		issues.forEach(issue => {
			const ticketURL = getUrlForTicket(issue.key);

			res.send(`${ticketURL} ${issue.fields.summary}`);
		});
	}
}

module.exports = function (robot) {
	robot.hear(regexp, function (res) {
		let requests = res.match.map(s => s.trim()).map(function (ticket) {
			return findIssue(ticket).catch(err => {
				robot.logger.error(err);
				return null;
			});
		});
		Promise.all(requests).then(issues => {
			send(robot, res, issues.filter(i => i !== null));
		}).catch(err => robot.logger.error(err));
	});
};
