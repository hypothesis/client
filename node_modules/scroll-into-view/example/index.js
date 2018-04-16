var crel = require('crel'),
    scrollIntoView = require('../');

window.addEventListener('load', function(){
    var menu;
    crel(document.body,
        crel('div', {'style':'position:absolute; height:300%; width: 100%'},
            crel('div', {'style':'position:absolute; width:300%; height: 300px; top:50%;'},
                crel('div', {'style':'position:absolute; height:200%; width: 300px; left:50%'},
                    target = crel('span', {'style':'position:absolute; top:50%; width: 150px'})
                )
            )
        ),
        menu = crel('nav', { style: 'position:fixed; top:0; left:0; bottom: 0; width: 200px; border: solid 4px white;' })
    );

    function align(){
        target.textContent = 'scrolling';
        scrollIntoView(target, {time: 1000}, function(type){
            target.textContent = type;
        });
    }
    align();

    function ease(){
        target.textContent = 'scrolling';
        scrollIntoView(target, {
            time: 1000,
            align:{
                top: 0,
                left: 0.5
            },
            ease: function(value){
                return 1 - Math.pow(1 - value, value / 5);
            }
        }, function(type){
            target.textContent = type;
        });
    }

    var side = 1;
    function buttonText(){
        return 'align ' + (side ? 'right' : 'left') + ' edge with menu';
    }
    function menuAlign(){
        target.textContent = 'scrolling';
        scrollIntoView(target, {
            time: 1000,
            align:{
                top: 0.5,
                left: 0,
                leftOffset: side ? 200 : 40,
                topOffset: 0
            }
        }, function(type){
            target.textContent = type;
        });
        side = (side + 1) % 2;
        button3.textContent = buttonText();
    }

    var button,
        button2;

    crel(menu,
        button = crel('button', {'style':'width: 190px'},
            'scroll into view'
        ),
        button2 = crel('button', {'style':'width: 190px'},
            'scroll into view with custom easing'
        ),
        button3 = crel('button', {'style':'width: 190px'},
            buttonText()
        )
    );

    button.addEventListener('click', align);
    button2.addEventListener('click', ease);
    button3.addEventListener('click', menuAlign);
});