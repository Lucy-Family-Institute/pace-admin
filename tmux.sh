#!/bin/bash     
# https://stackoverflow.com/questions/5447278/bash-scripts-with-tmux-to-launch-a-4-paned-window                                                                                            
# https://github.com/tmuxinator/tmuxinator
# https://stackoverflow.com/questions/11832199/tmux-set-g-mouse-mode-on-doesnt-work
SESSIONNAME="pace-admin"
tmux has-session -t $SESSIONNAME &> /dev/null

if [ $? != 0 ] 
 then
    TMUX= 
    tmux new-session -s $SESSIONNAME -d
    tmux rename-window 'main'
    tmux send-keys -t $SESSIONNAME "make docker" Enter
    tmux split-window -h 'make client'
    tmux split-window -h 'make migrate'
    tmux split-window -h
fi

tmux attach -t $SESSIONNAME