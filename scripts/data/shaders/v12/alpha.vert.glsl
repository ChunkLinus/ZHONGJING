#version 120

// Attributes (Inputs from the application, replaces 'in' for data like position/color)
attribute vec4 al_color;
attribute vec4 al_pos;

// Uniforms (Read-only variables set by the application)
uniform mat4 al_projview_matrix;

// Varying (Output to the Fragment Shader, replaces 'out')
varying vec4 v_color;

void main()
{
    // Built-in variable for the final, transformed vertex position (must be set)
    gl_Position = al_projview_matrix * al_pos;
    
    // Pass the color data on to the Fragment Shader via the 'varying' variable
    v_color = al_color;
}