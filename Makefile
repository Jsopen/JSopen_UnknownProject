#Copyright: Kevin 'Kassimo' Qian

all: install man

install:
	sudo npm install -g . --save
	path="export NODE_PATH=/usr/local/lib/node_modules"
	sudo echo "export NODE_PATH=/usr/local/lib/node_modules" >> ~/.bash_profile

man: jsopen.8
	sudo cp jsopen.8 /usr/share/man/man8

clean:
	sudo rm -f "/usr/share/man/man8/jsopen.8"
	sudo npm uninstall -g jsopen
