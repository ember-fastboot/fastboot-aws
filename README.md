## FastBoot Server for AWS

This is a server for hosting Ember apps in FastBoot mode on AWS. It is
based on the [FastBoot App
Server](https://github.com/ember-fastboot/fastboot-app-server),
configured to use the [S3
downloader](https://github.com/tomdale/fastboot-s3-downloader) and [S3
notifier](https://github.com/tomdale/fastboot-s3-notifier).

FastBoot allows Ember apps to be rendered on the server, to support
things like search crawlers and clients without JavaScript. For more
information about FastBoot, see
[ember-cli-fastboot][ember-cli-fastboot].

[ember-cli-fastboot]: https://github.com/ember-fastboot/ember-cli-fastboot

This server is designed to run either on Elastic Beanstalk or on your
own EC2 servers. It also works just fine for non-AWS hosting
environments, such as Heroku or Digital Ocean, if you want to use S3 for
deploying and storing your built application assets.

This server follows standard Node.js conventions; you can start it with
either `npm start` or `node server.js` and it respects the `PORT`
environment variable:

```
# start the server on HTTP port 80
$ PORT=80 node server.js
```

## Deploying on Elastic Beanstalk

### Create S3 Bucket

Create an S3 bucket for uploading the FastBoot builds of your Ember.js
application.

### Create FastBoot Build

Inside your Ember.js application, run `ember build`. Once that finishes,
zip up the resulting `dist` directory and upload it to the S3 bucket you
just created.

Next, create a new file called `fastboot-deploy-info.json`. Edit it to
have the following contents:

```json
{
  "bucket": "BUCKET_YOU_CREATED",
  "key": "NAME_OF_DIST_ZIP_FILE"
}
```

Upload it to the same bucket that you uploaded the zipped `dist` to.

### Create Elastic Beanstalk Application

The below instructions cover using the Elastic Beanstalk CLI tool. Feel
free to use the web console or the API instead.

#### Install `eb`

First, install the [Elastic Beanstalk CLI tool][eb-cli] (`pip install
awsebcli`) if you don't have it installed already.

[eb-cli]: http://docs.aws.amazon.com/elasticbeanstalk/latest/dg/eb-cli3.html

#### Initialize the Application

Clone this repository and `cd` into it in your terminal. Initialize the
directory as an EB application:

```sh
eb init
```

Enter your access key ID and secret access key if prompted. (You can
also pass `--profile` to `eb init` to use a saved credential profile
configured via the AWS CLI.)

Next, select your region. When prompted, choose the option to create a
new application:

```
Select an application to use
1) [ Create new Application ]
(default is 1):
```

Give your application a name. The `eb` tool should automatically detect
that the app is using Node.js; enter `y` when prompted.

Finally, decide whether you want to associate your instances with an SSH
keypair (if you don't, you won't be able to SSH into the server once
it's running).

Congratulations! You've created an Elastic Beanstalk app.

#### Create an Environment

Next, we'll need to create an environment. I like to create at least one
environment for staging and one for production.

In the environment, we'll tell the server where to find the built app on
S3 by setting environment variables.

Create an environment and give it the name of the S3 bucket as well as
the key to the JSON file you created and uploaded:

```sh
eb create --envvars FASTBOOT_S3_BUCKET=<s3-bucket>,FASTBOOT_S3_KEY=<s3-key>
```

Enter a name and a DNS CNAME prefix. (The CNAME prefix is used to create
a URL for your app; so if you enter `ember-fastboot` as the prefix, your
URL will be `ember-fastboot.elasticbeanstalk.com`.)

Once you've entered this information, `eb` will automatically zip up
the server and deploy it. You'll need to wait a few minutes while the
entire environment&mdash;security group, load balancer, EC2 instances,
etc.&mdash;all spin up.

After everything has been provisioned, you should see a message saying
the environment has moved to the "Ok" state.

Congratulations! You've just deployed a cluster of auto-scaling FastBoot
servers to Elastic Beanstalk.

#### Deploy FastBoot App

> **NOTE**: A cluster of FastBoots is called a stampede.
