#version 150

uniform float alpha;

in vec4 v_color;
out vec4 fragColor;

void main()
{
    vec4 c = v_color;
    c.a *= alpha;
    fragColor = c;
}
