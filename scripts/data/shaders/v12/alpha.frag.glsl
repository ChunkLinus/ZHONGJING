#version 120

uniform float alpha;

varying vec4 v_color;

void main()
{
    vec4 c = v_color;
    c.a *= alpha;
    gl_FragColor = c;
}